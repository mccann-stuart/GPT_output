import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function readViewer(file) {
  return readFileSync(join(root, file), 'utf8');
}

test('iPhone viewer uses the same R2 upload manifest selection path as desktop', () => {
  const desktopHtml = readViewer('index.html');
  const iphoneHtml = readViewer('iphone.html');

  for (const expected of [
    'fetchUploadedManifest',
    "'/api/upload-manifest'",
    'const FILE_SOURCES = new Map()',
    "FILE_SOURCES.set(file, 'r2')",
    '/jsxupload/Files/',
  ]) {
    assert.match(desktopHtml, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(iphoneHtml, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(desktopHtml, /\(uploaded\)/);
  assert.doesNotMatch(iphoneHtml, /\(uploaded\)/);
});
