import { readdirSync } from 'node:fs';

export function listRootJsxFiles(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsx'))
    .map((entry) => entry.name)
    .sort();
}

export function toManifestJson(files) {
  return `${JSON.stringify(files, null, 2)}\n`;
}
