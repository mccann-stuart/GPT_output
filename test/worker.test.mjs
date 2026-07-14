import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { buildBoeCsvUrl, findRequiredMjsImports, formatBoeDate, parseBoECsv, isSafeDeliverableFile } from '../src/worker.mjs';
import { makeR2Bucket } from './r2-mock.mjs';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeEnv() {
  return {
    ASSETS: {
      fetch: async () => new Response('asset fallback', { status: 200 }),
    },
  };
}

function makeUploadEnv() {
  return {
    ...makeEnv(),
    JSX_UPLOADS: makeR2Bucket(),
  };
}

function makeUploadRequest(files) {
  const form = new FormData();
  for (const file of files) {
    form.append('files', new File([file.text], file.name, { type: 'text/plain' }), file.name);
  }
  return new Request('https://example.com/api/upload-deliverable', {
    method: 'POST',
    body: form,
  });
}

const validPayload = {
  numAgents: 10,
  shiftStart: 8 * 60,
  shiftLength: 8 * 60,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 100,
  aht: 4,
  serviceTarget: 20,
  abandonTime: 180,
};

test('worker returns simulation view-model data for POST /api/simulate', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validPayload),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.params.expectedCalls, 100);
  assert.ok(Array.isArray(body.playback.events));
  assert.deepEqual(body.playback.initialState.agentStatus, new Array(validPayload.numAgents).fill('idle'));
  assert.equal(body.playback.footer.targetDisplay, '20s');
  assert.equal(typeof body.analysis.summary.asa.display, 'string');
  assert.ok(Array.isArray(body.analysis.hotspots));
  assert.ok(Array.isArray(body.analysis.charts.asa.values));
});

test('worker returns preview view-model data for POST /api/preview', async () => {
  const request = new Request('https://example.com/api/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shiftStart: validPayload.shiftStart,
      shiftLength: validPayload.shiftLength,
      numAgents: validPayload.numAgents,
      breakDur: validPayload.breakDur,
      numBreaks: validPayload.numBreaks,
    }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.curvePoints.length, 201);
  assert.ok(Array.isArray(body.breakWindows));
  assert.ok(Array.isArray(body.axisLabels));
});

test('worker returns 400 for invalid payload', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...validPayload, shiftLength: 0 }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /shiftLength/i);
});

test('worker rejects non-json api payloads', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify(validPayload),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 415);
  assert.match(body.error, /application\/json/i);
});

test('worker rejects malformed json api payloads', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ malformed_json: true ',
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /valid JSON/i);
});

test('worker rejects oversized api payloads', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...validPayload, padding: 'x'.repeat(5000) }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.match(body.error, /bytes or less/i);
});

test('worker returns 405 for non-POST simulate requests', async () => {
  const request = new Request('https://example.com/api/simulate', { method: 'GET' });
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.match(body.error, /method not allowed/i);
});

test('worker returns 405 for non-POST preview requests', async () => {
  const request = new Request('https://example.com/api/preview', { method: 'GET' });
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.match(body.error, /method not allowed/i);
});

test('worker falls back to static assets for non-api routes', async () => {
  const request = new Request('https://example.com/');
  const response = await worker.fetch(request, makeEnv(), {});

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset fallback');
});

test('worker uploads one JSX deliverable plus MJS logic to R2', async () => {
  const env = makeUploadEnv();
  const request = makeUploadRequest([
    {
      name: 'example.jsx',
      text: 'import { value } from "./example-logic.mjs";\nexport default function Example() { return value; }\n',
    },
    {
      name: 'example-logic.mjs',
      text: 'export const value = "ok";\n',
    },
  ]);

  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.jsxFile, 'example.jsx');
  assert.equal(body.version, '"etag-1"');
  assert.equal(body.openUrl, '/?file=example.jsx&source=r2&version=%22etag-1%22');
  assert.deepEqual(body.storedFiles.map((file) => file.key).sort(), [
    'jsxupload/Files/example-logic.mjs',
    'jsxupload/Files/example.jsx',
  ]);
  assert.deepEqual(env.JSX_UPLOADS.puts.map((put) => put.key).sort(), [
    'jsxupload/Files/example-logic.mjs',
    'jsxupload/Files/example.jsx',
  ]);
  assert.equal(env.JSX_UPLOADS.puts[0].options.httpMetadata.cacheControl, 'no-cache');
});

test('worker accepts uploaded JSX with supported browser module imports', async () => {
  const env = makeUploadEnv();
  const request = makeUploadRequest([
    {
      name: 'supported-modules-example.jsx',
      text: [
        'import React from "react";',
        'import { BadgeCheck } from "lucide-react";',
        'import _ from "lodash";',
        'import * as d3 from "d3";',
        'import Papa from "papaparse";',
        'import { evaluate } from "mathjs";',
        'import Chart from "chart.js";',
        'import * as Tone from "tone";',
        'import mammoth from "mammoth";',
        'import { Button } from "shadcn/ui";',
        'export default function Example() { return React.createElement(Button, null, _.startCase("ok")); }',
      ].join('\n'),
    },
  ]);

  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.jsxFile, 'supported-modules-example.jsx');
  assert.deepEqual(env.JSX_UPLOADS.puts.map((put) => put.key), ['jsxupload/Files/supported-modules-example.jsx']);
});

test('worker rejects uploaded JSX with unsupported bare imports before storing files', async () => {
  const env = makeUploadEnv();
  const request = makeUploadRequest([
    {
      name: 'bad-import.jsx',
      text: 'import value from "unsupported-package";\nexport default function Bad() { return value; }\n',
    },
  ]);

  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /unsupported bare import.*unsupported-package/i);
  assert.match(body.error, /Supported modules:.*shadcn\/ui/s);
  assert.equal(env.JSX_UPLOADS.puts.length, 0);
});

test('worker rejects upload file names that are unsafe or unsupported', async () => {
  const request = makeUploadRequest([
    { name: '../bad.jsx', text: 'export default function Bad() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /unsafe|unsupported/i);
});

test('worker rejects uploads with more than one JSX file', async () => {
  const request = makeUploadRequest([
    { name: 'one.jsx', text: 'export default function One() { return null; }' },
    { name: 'two.jsx', text: 'export default function Two() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /exactly one/i);
});

test('worker rejects uploaded JSX that imports a missing MJS file', async () => {
  const request = makeUploadRequest([
    { name: 'missing.jsx', text: 'import { value } from "./missing-logic.mjs";\nexport default function Missing() { return value; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /missing file/i);
});

test('worker rejects uploaded JSX that side-effect imports a missing MJS file without space', async () => {
  const request = makeUploadRequest([
    { name: 'missing-side-effect-nospace.jsx', text: 'import"./missing-logic.mjs";\nexport default function Missing() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /missing file/i);
});

test('worker rejects uploaded JSX that side-effect imports a missing MJS file', async () => {
  const request = makeUploadRequest([
    { name: 'missing-side-effect.jsx', text: 'import "./missing-logic.mjs";\nexport default function Missing() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /missing file/i);
});

test('worker rejects oversized uploaded files', async () => {
  const request = makeUploadRequest([
    { name: 'large.jsx', text: `export default ${JSON.stringify('x'.repeat(512 * 1024))};` },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.match(body.error, /bytes or less/i);
});

test('worker reports missing R2 binding for upload requests', async () => {
  const request = makeUploadRequest([
    { name: 'example.jsx', text: 'export default function Example() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(body.error, /JSX_UPLOADS R2 binding/i);
});

test('worker upload manifest lists only safe R2 JSX files', async () => {
  const env = {
    ...makeEnv(),
    JSX_UPLOADS: makeR2Bucket({
      'jsxupload/Files/example.jsx': 'export default function Example() { return null; }',
      'jsxupload/Files/example.mjs': 'export const value = true;',
      'jsxupload/Files/other.jsx': 'export default function Other() { return null; }',
      'jsxupload/Files/nested/bad.jsx': 'export default function Bad() { return null; }',
      'elsewhere/ignored.jsx': 'export default function Ignored() { return null; }',
    }),
  };

  const request = new Request('https://example.com/api/upload-manifest');
  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.files, ['example.jsx', 'other.jsx']);
});

test('worker serves uploaded JSX and MJS from R2', async () => {
  const env = {
    ...makeEnv(),
    JSX_UPLOADS: makeR2Bucket({
      'jsxupload/Files/example.jsx': 'export default function Example() { return null; }',
      'jsxupload/Files/example-logic.mjs': 'export const value = "ok";',
    }),
  };

  const jsxResponse = await worker.fetch(new Request('https://example.com/jsxupload/Files/example.jsx'), env, {});
  const mjsResponse = await worker.fetch(new Request('https://example.com/jsxupload/Files/example-logic.mjs'), env, {});

  assert.equal(jsxResponse.status, 200);
  assert.equal(jsxResponse.headers.get('content-type'), 'text/jsx; charset=utf-8');
  assert.match(await jsxResponse.text(), /export default function Example/);
  assert.equal(mjsResponse.status, 200);
  assert.equal(mjsResponse.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(await mjsResponse.text(), /export const value/);
});

test('worker returns 404 for missing R2 uploaded files', async () => {
  const env = makeUploadEnv();
  const request = new Request('https://example.com/jsxupload/Files/missing.jsx');
  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.match(body.error, /not found/i);
});

test('worker returns live indicators data for GET /api/live-indicators when fetch succeeds', async () => {
  let capturedRequest;
  globalThis.fetch = async (url, init) => {
    capturedRequest = { url: String(url), init };
    if (url.includes('bankofengland.co.uk')) {
      return new Response(
        `DATE,IUDBEDR,IUDSOIA\n15 Jun 2026,3.75,3.7296\n16 Jun 2026,3.75,3.7304\n17 Jun 2026,3.75,3.7303\n`,
        { status: 200 }
      );
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  };

  const request = new Request('https://example.com/api/live-indicators');
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.bankRate, 3.75);
  assert.equal(body.sonia, 3.7303);
  assert.equal(body.swap2y, 4.0203); // sonia + 0.29
  assert.equal(body.swap5y, 4.0503); // sonia + 0.32
  assert.equal(body.lastUpdated, '17 Jun 2026');
  assert.equal(body.source, 'live');
  assert.match(capturedRequest.url, /boeapps\/database\/_iadb-FromShowColumns\.asp/);
  assert.match(capturedRequest.url, /SeriesCodes=IUDBEDR%2CIUDSOIA/);
  // BoE sits behind Akamai bot protection: the fetch must send a browser
  // User-Agent or the Cloudflare edge gets served a block page (see worker).
  assert.match(capturedRequest.init.headers['User-Agent'], /Mozilla\/5\.0/);
  assert.match(capturedRequest.init.headers.Accept, /text\/csv/);
});

test('worker uses the latest complete live indicators row when the newest row is partial', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('bankofengland.co.uk')) {
      return new Response(
        `DATE,IUDBEDR,IUDSOIA\n16 Jun 2026,3.75,3.7304\n17 Jun 2026,3.75,3.7303\n18 Jun 2026,3.75,\n`,
        { status: 200 }
      );
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  };

  const request = new Request('https://example.com/api/live-indicators');
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.bankRate, 3.75);
  assert.equal(body.sonia, 3.7303);
  assert.equal(body.lastUpdated, '17 Jun 2026');
  assert.equal(body.source, 'live');
});

test('worker returns fallback indicators data for GET /api/live-indicators when fetch fails', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('bankofengland.co.uk')) {
      return new Response('internal error', { status: 500 });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  };

  const request = new Request('https://example.com/api/live-indicators');
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.bankRate, 3.75);
  assert.equal(body.sonia, 3.7303);
  assert.equal(body.swap2y, 4.02);
  assert.equal(body.swap5y, 4.05);
  assert.equal(body.lastUpdated, '17 Jun 2026');
  assert.equal(body.source, 'fallback');
});

test('worker returns 405 for non-GET live-indicators requests', async () => {
  const request = new Request('https://example.com/api/live-indicators', { method: 'POST' });
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.match(body.error, /method not allowed/i);
});

test('worker overwrites existing R2 files on upload without error', async () => {
  const env = makeUploadEnv();

  // Pre-populate R2 with a file under the prefix
  await env.JSX_UPLOADS.put('jsxupload/Files/example.jsx', 'initial content');

  const request = makeUploadRequest([
    {
      name: 'example.jsx',
      text: 'import { value } from "./example-logic.mjs";\nexport default function Example() { return value; }\n',
    },
    {
      name: 'example-logic.mjs',
      text: 'export const value = "ok";\n',
    },
  ]);

  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.jsxFile, 'example.jsx');

  // Verify that the file in the mock R2 was overwritten with the new content
  const overwrittenObject = await env.JSX_UPLOADS.get('jsxupload/Files/example.jsx');
  assert.equal(overwrittenObject.body, 'import { value } from "./example-logic.mjs";\nexport default function Example() { return value; }\n');
});


test('findRequiredMjsImports extracts valid local .mjs imports', () => {
  const jsxText = `
    import { something } from "./module1.mjs";
    import "./module2.mjs";
    export { other } from "./module3.mjs";
    import * as all from "./module4.mjs";
    import def from "./module1.mjs";
  `;
  const imports = findRequiredMjsImports(jsxText);
  assert.equal(imports.size, 4);
  assert.ok(imports.has('module1.mjs'));
  assert.ok(imports.has('module2.mjs'));
  assert.ok(imports.has('module3.mjs'));
  assert.ok(imports.has('module4.mjs'));
});

test('findRequiredMjsImports ignores external imports and throws on invalid local imports', () => {
  const externalJsx = `
    import React from "react";
    import { Button } from "shadcn/ui";
    import { evaluate } from "mathjs";
  `;
  const imports = findRequiredMjsImports(externalJsx);
  assert.equal(imports.size, 0);

  assert.throws(() => {
    findRequiredMjsImports(`import { foo } from "./../parent.mjs";`);
  }, /Uploaded JSX imports must be flat local files/);

  assert.throws(() => {
    findRequiredMjsImports(`import { baz } from "./module.js";`);
  }, /Uploaded JSX may only import flat local .mjs files/);
});

test('formatBoeDate properly formats dates', () => {
  assert.equal(formatBoeDate(new Date(2023, 0, 5)), '05/Jan/2023');
  assert.equal(formatBoeDate(new Date(2023, 11, 31)), '31/Dec/2023');
});

test('buildBoeCsvUrl generates correct URL for a given date', () => {
  const url = buildBoeCsvUrl(new Date('2023-11-15T12:00:00Z'));
  assert.equal(url, 'https://www.bankofengland.co.uk/boeapps/database/_iadb-FromShowColumns.asp?csv.x=yes&Datefrom=16%2FOct%2F2023&Dateto=15%2FNov%2F2023&SeriesCodes=IUDBEDR%2CIUDSOIA&CSVF=TN&UsingCodes=Y');

  const url2 = buildBoeCsvUrl(new Date('2024-03-15T12:00:00Z'));
  assert.equal(url2, 'https://www.bankofengland.co.uk/boeapps/database/_iadb-FromShowColumns.asp?csv.x=yes&Datefrom=14%2FFeb%2F2024&Dateto=15%2FMar%2F2024&SeriesCodes=IUDBEDR%2CIUDSOIA&CSVF=TN&UsingCodes=Y');
});

test('parseBoECsv correctly parses standard BoE CSV', () => {
  const csvText = `DATE,IUDBEDR,IUDSOIA\n15 Jun 2026,3.75,3.7296\n16 Jun 2026,3.75,3.7304\n17 Jun 2026,3.75,3.7303\n`;
  const result = parseBoECsv(csvText);
  assert.deepEqual(result, { bankRate: 3.75, sonia: 3.7303, date: '17 Jun 2026' });
});

test('parseBoECsv returns null for CSV with less than 2 lines', () => {
  const csvText = `DATE,IUDBEDR,IUDSOIA\n`;
  const result = parseBoECsv(csvText);
  assert.equal(result, null);
});

test('parseBoECsv returns null for CSV with missing required headers', () => {
  const csvText = `DATE,IUDBEDR\n15 Jun 2026,3.75\n`;
  const result = parseBoECsv(csvText);
  assert.equal(result, null);
});

test('parseBoECsv handles partial or invalid latest rows by falling back to older rows', () => {
  const csvText = `DATE,IUDBEDR,IUDSOIA\n16 Jun 2026,3.75,3.7304\n17 Jun 2026,3.75,3.7303\n18 Jun 2026,3.75,\n`;
  const result = parseBoECsv(csvText);
  assert.deepEqual(result, { bankRate: 3.75, sonia: 3.7303, date: '17 Jun 2026' });
});

test('parseBoECsv returns null if no rows have valid numbers', () => {
  const csvText = `DATE,IUDBEDR,IUDSOIA\n16 Jun 2026,, \n17 Jun 2026,NaN,NaN\n`;
  const result = parseBoECsv(csvText);
  assert.equal(result, null);
});

test("isSafeDeliverableFile validates file names correctly", () => {
  assert.equal(isSafeDeliverableFile("file.jsx"), true);
  assert.equal(isSafeDeliverableFile("file.mjs"), true);
  assert.equal(isSafeDeliverableFile("a.jsx"), true);
  assert.equal(isSafeDeliverableFile("1.mjs"), true);
  assert.equal(isSafeDeliverableFile("my-file_name.jsx"), true);
  assert.equal(isSafeDeliverableFile(".jsx"), false);
  assert.equal(isSafeDeliverableFile("file.js"), false);
  assert.equal(isSafeDeliverableFile("../file.jsx"), false);
  assert.equal(isSafeDeliverableFile("file/name.jsx"), false);
  assert.equal(isSafeDeliverableFile("file name.jsx"), false);
  assert.equal(isSafeDeliverableFile(null), false);
  assert.equal(isSafeDeliverableFile(undefined), false);
  assert.equal(isSafeDeliverableFile(123), false);
  assert.equal(isSafeDeliverableFile({}), false);
});
