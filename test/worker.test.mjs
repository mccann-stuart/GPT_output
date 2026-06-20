import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/worker.mjs';

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

function makeR2Object(key, value, options = {}, etag = `"etag-${key}"`) {
  return {
    key,
    etag,
    httpEtag: etag,
    uploaded: new Date('2026-05-08T00:00:00.000Z'),
    body: value,
    httpMetadata: options.httpMetadata || {},
    writeHttpMetadata(headers) {
      if (this.httpMetadata.contentType) {
        headers.set('content-type', this.httpMetadata.contentType);
      }
      if (this.httpMetadata.cacheControl) {
        headers.set('cache-control', this.httpMetadata.cacheControl);
      }
    },
  };
}

function makeR2Bucket(initialObjects = {}) {
  const objects = new Map();
  for (const [key, value] of Object.entries(initialObjects)) {
    objects.set(key, makeR2Object(key, value));
  }
  return {
    objects,
    puts: [],
    async put(key, value, options = {}) {
      const object = makeR2Object(key, value, options, `"etag-${this.puts.length + 1}"`);
      this.objects.set(key, object);
      this.puts.push({ key, value, options });
      return object;
    },
    async get(key) {
      return this.objects.get(key) || null;
    },
    async list({ prefix = '' } = {}) {
      const listedObjects = [...this.objects.values()]
        .filter((object) => object.key.startsWith(prefix))
        .map((object) => ({ key: object.key, etag: object.etag, uploaded: object.uploaded }));
      return {
        objects: listedObjects,
        truncated: false,
      };
    },
  };
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
