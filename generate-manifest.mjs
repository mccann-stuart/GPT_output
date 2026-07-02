#!/usr/bin/env node
/**
 * Scans the project root for *.jsx files and writes public/jsx-manifest.json.
 * Run:  node generate-manifest.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRootJsxFiles, toManifestJson } from './manifest-files.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');

const jsxFiles = await listRootJsxFiles(root);
const out = join(publicDir, 'jsx-manifest.json');

mkdirSync(publicDir, { recursive: true });
writeFileSync(out, toManifestJson(jsxFiles));

console.log(`public/jsx-manifest.json -> ${jsxFiles.length} file(s): ${jsxFiles.join(', ')}`);
