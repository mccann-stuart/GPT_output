import { readdir } from 'node:fs/promises';

export function listRootJsxFiles(root) {
  return readdir(root).then((files) =>
    files.filter((f) => f.endsWith('.jsx') && !f.startsWith('.')).sort()
  );
}

export function toManifestJson(files) {
  return `${JSON.stringify(files, null, 2)}\n`;
}
