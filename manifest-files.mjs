import { readdir } from 'node:fs/promises';

export function listRootJsxFiles(root) {
  return readdir(root, { withFileTypes: true }).then((entries) =>
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsx') && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort()
  );
}

export function toManifestJson(files) {
  if (!Array.isArray(files)) {
    throw new TypeError('Expected an array of files');
  }
  return `${JSON.stringify(files, null, 2)}\n`;
}
