#!/usr/bin/env node
/**
 * Scans the project root for *.jsx files and writes jsx-manifest.json.
 * Run:  node generate-manifest.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRootJsxFiles, toManifestJson } from './manifest-files.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const jsxFiles = listRootJsxFiles(root);

const out = join(root, 'jsx-manifest.json');
writeFileSync(out, toManifestJson(jsxFiles));

console.log(`jsx-manifest.json → ${jsxFiles.length} file(s): ${jsxFiles.join(', ')}`);
