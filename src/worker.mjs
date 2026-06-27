import { buildSimulationViewModel, computePreview } from '../server/simulate-engine.mjs';
import { assertSupportedJsxImports } from '../jsx-import-validator.mjs';

const MAX_JSON_BODY_BYTES = 4096;
const MAX_UPLOAD_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_FILE_BYTES = 512 * 1024;
const SAFE_DELIVERABLE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/;
const LOCAL_IMPORT_PATTERN = /\b(?:import(?:\s+[^'"]*?from|\s*)?|export\s+[^'"]*?from|import\s*\()\s*['"](\.[^'"]+)['"]/g;
const R2_UPLOAD_PREFIX = 'jsxupload/Files/';
const R2_ROUTE_PREFIX = '/jsxupload/Files/';
const BOE_IADB_CSV_ENDPOINT = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-FromShowColumns.asp';
const BOE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The BoE site is behind Akamai bot protection. Requests from datacenter IPs
// (e.g. the Cloudflare edge) without a browser User-Agent get served a block
// page, so the live fetch must present a realistic browser UA.
const BOE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
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

function formatBoeDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${BOE_MONTHS[date.getMonth()]}/${date.getFullYear()}`;
}

function buildBoeCsvUrl(today = new Date()) {
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const params = new URLSearchParams({
    'csv.x': 'yes',
    Datefrom: formatBoeDate(thirtyDaysAgo),
    Dateto: formatBoeDate(today),
    SeriesCodes: 'IUDBEDR,IUDSOIA',
    CSVF: 'TN',
    UsingCodes: 'Y',
  });

  return `${BOE_IADB_CSV_ENDPOINT}?${params.toString()}`;
}

function parseBoECsv(csvText) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(',');
  const bankRateIdx = headers.indexOf('IUDBEDR');
  const soniaIdx = headers.indexOf('IUDSOIA');
  const dateIdx = headers.indexOf('DATE');

  if (bankRateIdx === -1 || soniaIdx === -1 || dateIdx === -1) {
    return null;
  }

  for (let i = lines.length - 1; i >= 1; i--) {
    const cols = lines[i].split(',');
    const dateVal = cols[dateIdx];
    const bankRateVal = parseFloat(cols[bankRateIdx]);
    const soniaVal = parseFloat(cols[soniaIdx]);

    if (!isNaN(bankRateVal) && !isNaN(soniaVal)) {
      return {
        bankRate: bankRateVal,
        sonia: soniaVal,
        date: dateVal
      };
    }
  }

  return null;
}

async function handleLiveIndicators(request, env) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(buildBoeCsvUrl(), {
      headers: {
        'User-Agent': BOE_USER_AGENT,
        Accept: 'text/csv,application/csv,text/plain;q=0.9,*/*;q=0.5'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`BoE request failed with status: ${res.status}`);
    }

    const csvText = await res.text();
    const parsed = parseBoECsv(csvText);

    if (!parsed || parsed.bankRate === null || parsed.sonia === null) {
      throw new Error('Failed to parse required rates from BoE response');
    }

    const bankRate = parsed.bankRate;
    const sonia = parsed.sonia;
    const swap2y = parseFloat((sonia + 0.29).toFixed(4));
    const swap5y = parseFloat((sonia + 0.32).toFixed(4));

    return json({
      bankRate,
      sonia,
      swap2y,
      swap5y,
      gilt2y: swap2y,
      gilt5y: swap5y,
      lastUpdated: parsed.date,
      source: 'live'
    });

  } catch (err) {
    console.warn('Failed to fetch live indicators from Bank of England, returning fallback:', err.message);
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
