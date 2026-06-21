import { buildSimulationViewModel, computePreview } from '../server/simulate-engine.mjs';
import { assertSupportedJsxImports } from '../jsx-import-validator.mjs';

const MAX_JSON_BODY_BYTES = 4096;
const MAX_UPLOAD_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_FILE_BYTES = 512 * 1024;
const SAFE_DELIVERABLE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/;
const LOCAL_IMPORT_PATTERN = /\b(?:import\s+[^'"]*?from|export\s+[^'"]*?from|import\s*\()\s*['"](\.[^'"]+)['"]/g;
const R2_UPLOAD_PREFIX = 'jsxupload/Files/';
const R2_ROUTE_PREFIX = '/jsxupload/Files/';
// Live data source.
//
// The Bank of England's own IADB CSV endpoint sits behind Akamai bot protection
// that blocks the Cloudflare Worker egress entirely (HTTP 500 challenge page,
// regardless of request headers). FRED's public graph-download endpoint
// (fred.stlouisfed.org/graph/fredgraph.csv) is likewise blocked from the edge
// (the connection is reset, surfaced as HTTP 520). FRED's official developer
// API host (api.stlouisfed.org) IS reachable from Workers and mirrors the exact
// BoE SONIA series (IUDSOIA, sourced from the Bank of England), so live SONIA —
// the value that actually drives the model — is sourced from there. The API
// requires a free key, supplied via the FRED_API_KEY Worker secret; without it
// the endpoint serves the static fallback below.
const FRED_API_ENDPOINT = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_SONIA_SERIES = 'IUDSOIA';
const LIVE_DATA_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// BoE Bank Rate has no keyless live daily mirror on FRED (IUDBEDR is absent and
// BOERUKM was discontinued in 2017). It is the MPC policy rate, which only moves
// at scheduled meetings, so the current value is kept here and updated on change.
const CURRENT_BANK_RATE = 3.75;
const LIVE_INDICATOR_FALLBACK = {
  bankRate: 3.75,
  sonia: 3.7303,
  swap2y: 4.02,
  swap5y: 4.05,
  gilt2y: 4.02,
  gilt5y: 4.05,
  lastUpdated: '17 Jun 2026',
  source: 'fallback'
};

class ApiRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function errorResponse(status, message) {
  return json({ error: message }, { status });
}

function isSafeDeliverableFile(value) {
  return typeof value === 'string' && SAFE_DELIVERABLE_FILE.test(value);
}

function getUploadBucket(env) {
  if (!env.JSX_UPLOADS) {
    throw new ApiRequestError(500, 'JSX_UPLOADS R2 binding is not configured');
  }
  return env.JSX_UPLOADS;
}

function uploadObjectKey(file) {
  return `${R2_UPLOAD_PREFIX}${file}`;
}

function uploadPublicPath(file) {
  return `${R2_ROUTE_PREFIX}${encodeURIComponent(file)}`;
}

function contentTypeForFile(file) {
  if (file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.jsx')) return 'text/jsx; charset=utf-8';
  return 'application/octet-stream';
}

function objectVersion(object) {
  return object?.etag || object?.version || object?.uploaded?.getTime?.().toString() || Date.now().toString(36);
}

function openUrlForUploadedJsx(file, version) {
  return `/?file=${encodeURIComponent(file)}&source=r2&version=${encodeURIComponent(version)}`;
}

function normalizeLocalImport(specifier) {
  if (!specifier.startsWith('./')) return null;
  const withoutPrefix = specifier.slice(2);
  if (!withoutPrefix || withoutPrefix.includes('/') || withoutPrefix.includes('\\') || withoutPrefix.startsWith('.')) {
    throw new ApiRequestError(400, `Uploaded JSX imports must be flat local files: ${specifier}`);
  }
  if (!withoutPrefix.endsWith('.mjs')) {
    throw new ApiRequestError(400, `Uploaded JSX may only import flat local .mjs files: ${specifier}`);
  }
  if (!isSafeDeliverableFile(withoutPrefix)) {
    throw new ApiRequestError(400, `Uploaded JSX imports an unsafe file name: ${specifier}`);
  }
  return withoutPrefix;
}

function findRequiredMjsImports(jsxText) {
  const required = new Set();
  for (const match of jsxText.matchAll(LOCAL_IMPORT_PATTERN)) {
    const normalized = normalizeLocalImport(match[1]);
    if (normalized) required.add(normalized);
  }
  return required;
}

async function readUploadFiles(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new ApiRequestError(415, 'Request content-type must be multipart/form-data');
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_UPLOAD_BODY_BYTES) {
    throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
  }

  const form = await request.formData();
  const files = [];
  for (const value of form.values()) {
    if (typeof value === 'string') {
      throw new ApiRequestError(400, 'Upload form fields must be files');
    }
    files.push(value);
  }

  if (files.length === 0) {
    throw new ApiRequestError(400, 'Upload must include one .jsx file and optional .mjs files');
  }

  const seen = new Set();
  const uploads = [];
  let totalBytes = 0;
  for (const file of files) {
    const name = file.name || '';
    if (!isSafeDeliverableFile(name)) {
      throw new ApiRequestError(400, `Unsafe or unsupported file name: ${name || '(unnamed file)'}`);
    }
    if (seen.has(name)) {
      throw new ApiRequestError(400, `Duplicate uploaded file name: ${name}`);
    }
    seen.add(name);
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new ApiRequestError(413, `${name} must be ${MAX_UPLOAD_FILE_BYTES} bytes or less`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_UPLOAD_BODY_BYTES) {
      throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
    }
    uploads.push({ name, text: await file.text() });
  }

  const jsxFiles = uploads.filter((file) => file.name.endsWith('.jsx'));
  if (jsxFiles.length !== 1) {
    throw new ApiRequestError(400, 'Upload must include exactly one .jsx file');
  }
  const jsxFile = jsxFiles[0];

  try {
    assertSupportedJsxImports(jsxFile.text, { file: jsxFile.name });
  } catch (error) {
    throw new ApiRequestError(400, error instanceof Error ? error.message : 'Uploaded JSX contains unsupported imports');
  }

  const uploadedNames = new Set(uploads.map((file) => file.name));
  const requiredImports = findRequiredMjsImports(jsxFile.text);
  for (const importedFile of requiredImports) {
    if (!uploadedNames.has(importedFile)) {
      throw new ApiRequestError(400, `Uploaded JSX imports missing file: ${importedFile}`);
    }
  }

  return { uploads, jsxFile: jsxFiles[0].name };
}

async function storeUploadedFiles(env, uploads) {
  const bucket = getUploadBucket(env);
  const storedFiles = await Promise.all(
    uploads.map(async (upload) => {
      const key = uploadObjectKey(upload.name);
      const object = await bucket.put(key, upload.text, {
        httpMetadata: {
          contentType: contentTypeForFile(upload.name),
          cacheControl: 'no-cache',
        },
        customMetadata: {
          uploadedBy: 'gpt-outputs-viewer',
        },
      });
      return {
        file: upload.name,
        key,
        version: objectVersion(object),
      };
    })
  );
  return storedFiles;
}

async function listUploadedJsxFiles(env) {
  const bucket = getUploadBucket(env);
  const files = new Set();
  let cursor;
  do {
    const result = await bucket.list({
      prefix: R2_UPLOAD_PREFIX,
      cursor,
    });
    for (const object of result.objects || []) {
      const file = object.key?.slice(R2_UPLOAD_PREFIX.length);
      if (isSafeDeliverableFile(file) && file.endsWith('.jsx')) {
        files.add(file);
      }
    }
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return [...files].sort();
}

function fileFromR2Route(pathname) {
  if (!pathname.startsWith(R2_ROUTE_PREFIX)) {
    return null;
  }
  const encodedFile = pathname.slice(R2_ROUTE_PREFIX.length);
  let file;
  try {
    file = decodeURIComponent(encodedFile);
  } catch {
    throw new ApiRequestError(400, 'Uploaded file path is invalid');
  }
  if (!isSafeDeliverableFile(file)) {
    throw new ApiRequestError(400, 'Uploaded file path must be a safe .jsx or .mjs file name');
  }
  return file;
}

async function serveUploadedFile(request, env) {
  const url = new URL(request.url);
  const file = fileFromR2Route(url.pathname);
  if (!file) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(405, 'Method not allowed');
  }

  const object = await getUploadBucket(env).get(uploadObjectKey(file));
  if (!object) {
    return errorResponse(404, 'Uploaded file not found');
  }

  const headers = new Headers({
    'content-type': contentTypeForFile(file),
    'cache-control': 'no-cache',
  });
  if (object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }
  if (typeof object.writeHttpMetadata === 'function') {
    object.writeHttpMetadata(headers);
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

async function handleUploadDeliverable(request, env) {
  if (request.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const { uploads, jsxFile } = await readUploadFiles(request);
  const storedFiles = await storeUploadedFiles(env, uploads);
  const jsxObject = storedFiles.find((file) => file.file === jsxFile);
  const version = jsxObject?.version || Date.now().toString(36);
  const openUrl = openUrlForUploadedJsx(jsxFile, version);

  return json({
    jsxFile,
    storedFiles,
    version,
    openUrl,
  });
}

async function handleUploadManifest(request, env) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }
  return json({ files: await listUploadedJsxFiles(env) });
}

async function readJsonPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiRequestError(415, 'Request content-type must be application/json');
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }

  const bodyText = await request.text();
  const bodyBytes = new TextEncoder().encode(bodyText).length;
  if (bodyBytes > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new ApiRequestError(400, 'Request body must be valid JSON');
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildFredApiUrl(seriesId, apiKey, today = new Date()) {
  const start = new Date(today);
  start.setDate(today.getDate() - 45);

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: isoDate(start),
    sort_order: 'desc',
    limit: '10',
  });

  return `${FRED_API_ENDPOINT}?${params.toString()}`;
}

// The FRED API returns { observations: [{ date, value }, ...] }. With
// sort_order=desc the newest observation is first; missing values are rendered
// as ".". Return the most recent observation that carries a numeric value.
function parseFredObservations(payload) {
  const observations = payload && Array.isArray(payload.observations) ? payload.observations : [];
  for (const observation of observations) {
    const value = parseFloat(observation?.value);
    if (!isNaN(value)) {
      return { value, date: observation.date };
    }
  }
  return null;
}

// Convert a FRED ISO observation date (YYYY-MM-DD) to the "17 Jun 2026" style
// the indicator board renders.
function formatDisplayDate(isoStr) {
  const [year, month, day] = String(isoStr).split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) {
    return isoStr;
  }
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1]} ${year}`;
}

async function handleLiveIndicators(request, env) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  const apiKey = env.FRED_API_KEY;
  if (!apiKey) {
    console.warn('FRED_API_KEY is not configured; serving fallback indicators.');
    return json(LIVE_INDICATOR_FALLBACK);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(buildFredApiUrl(FRED_SONIA_SERIES, apiKey), {
      headers: {
        'User-Agent': LIVE_DATA_USER_AGENT,
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`FRED API request failed with status: ${res.status}`);
    }

    const parsed = parseFredObservations(await res.json());

    if (!parsed) {
      throw new Error('FRED API response contained no usable SONIA observation');
    }

    const sonia = parsed.value;
    const swap2y = parseFloat((sonia + 0.29).toFixed(4));
    const swap5y = parseFloat((sonia + 0.32).toFixed(4));

    return json({
      bankRate: CURRENT_BANK_RATE,
      sonia,
      swap2y,
      swap5y,
      gilt2y: swap2y,
      gilt5y: swap5y,
      lastUpdated: formatDisplayDate(parsed.date),
      source: 'live'
    });

  } catch (err) {
    console.warn('Failed to fetch live indicators from FRED, returning fallback:', err.message);
    return json(LIVE_INDICATOR_FALLBACK);
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      const uploadedFileResponse = await serveUploadedFile(request, env);
      if (uploadedFileResponse) {
        return uploadedFileResponse;
      }

      if (url.pathname === '/api/upload-deliverable') {
        return await handleUploadDeliverable(request, env);
      }

      if (url.pathname === '/api/upload-manifest') {
        return await handleUploadManifest(request, env);
      }

      if (url.pathname === '/api/live-indicators') {
        return await handleLiveIndicators(request, env);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return errorResponse(error.status, error.message);
      }
      return errorResponse(500, error instanceof Error ? error.message : 'Upload request failed');
    }

    if (url.pathname === '/api/simulate') {
      if (request.method !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }

      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, 'Request body must be valid JSON');
      }

      try {
        return json(buildSimulationViewModel(payload));
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : 'Invalid simulation payload');
      }
    }

    if (url.pathname === '/api/preview') {
      if (request.method !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }

      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, 'Request body must be valid JSON');
      }

      try {
        const result = computePreview(payload);
        return json(result);
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : 'Invalid preview payload');
      }
    }

    return env.ASSETS.fetch(request);
  },
};
