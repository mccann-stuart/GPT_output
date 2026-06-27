import fs from 'fs';
const content = fs.readFileSync('test/viewer-shared.test.mjs', 'utf8');

const topLevelImports = `import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeObjectKey,
  isAllowedManifestFile,
  truncateMiddle,
  isPlainObject,
  deepClone,
  deepEqual,
  applyOverrides,
  diffFromDefaults,
  encodeBase64Url,
  decodeBase64Url,
  parseSharedState,
  isSafeUploadFileName
} from "../viewer-shared.mjs";
`;

let cleanedContent = content.replace(/import test from "node:test";/g, '');
cleanedContent = cleanedContent.replace(/import assert from "node:assert\/strict";/g, '');
cleanedContent = cleanedContent.replace(/import\s*{[^}]*}\s*from\s*"..\/viewer-shared.mjs";/g, '');

let finalContent = (topLevelImports + '\n' + cleanedContent).replace(/\n{3,}/g, '\n\n');

fs.writeFileSync('test/viewer-shared.test.mjs', finalContent);
console.log('Imports grouped successfully.');
