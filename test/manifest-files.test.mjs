import test from 'node:test';
import assert from 'node:assert/strict';

import { listRootJsxFiles, toManifestJson } from '../manifest-files.mjs';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

// Helper to create and clean up fixtures
function setupFixtures(testName, files, dirs = []) {
  const fixtureDir = join(rootDir, 'test', 'fixtures', testName);
  fs.mkdirSync(fixtureDir, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(join(fixtureDir, file), '');
  }
  for (const dir of dirs) {
    fs.mkdirSync(join(fixtureDir, dir), { recursive: true });
  }
  return fixtureDir;
}

function teardownFixtures(fixtureDir) {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}

test('listRootJsxFiles returns only sorted .jsx files and ignores dotfiles', async () => {
  const fixtureDir = setupFixtures('manifest_files_basic', [
    'Widget.jsx',
    'app.jsx',
    'index.html',
    'utils.mjs',
    '.hidden.jsx'
  ]);

  try {
    const result = await listRootJsxFiles(fixtureDir);
    assert.deepEqual(result, ['Widget.jsx', 'app.jsx']);
  } finally {
    teardownFixtures(fixtureDir);
  }
});

test('listRootJsxFiles correctly ignores directories ending in .jsx', async () => {
  const fixtureDir = setupFixtures('manifest_files_dir_check', [
    'Widget.jsx'
  ], ['fake.jsx']);

  try {
    const result = await listRootJsxFiles(fixtureDir);
    assert.deepEqual(result, ['Widget.jsx']);
  } finally {
    teardownFixtures(fixtureDir);
  }
});

test('listRootJsxFiles returns empty array when no .jsx files found', async () => {
  const fixtureDir = setupFixtures('manifest_empty_basic', ['index.html']);
  try {
    const result = await listRootJsxFiles(fixtureDir);
    assert.deepEqual(result, []);
  } finally {
    teardownFixtures(fixtureDir);
  }
});

test('toManifestJson formats array into JSON string with newline', () => {
  const files = ['Widget.jsx', 'app.jsx'];
  const expected = '[\n  "Widget.jsx",\n  "app.jsx"\n]\n';

  const result = toManifestJson(files);

  assert.equal(result, expected);
});

test('toManifestJson throws TypeError for null', () => {
  assert.throws(
    () => toManifestJson(null),
    TypeError
  );
});

test('toManifestJson throws TypeError for undefined', () => {
  assert.throws(
    () => toManifestJson(undefined),
    TypeError
  );
});

test('toManifestJson handles empty array', () => {
  const files = [];
  const expected = '[]\n';

  const result = toManifestJson(files);

  assert.equal(result, expected);
});
