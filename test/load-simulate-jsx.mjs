import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { transform } from 'esbuild';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(rootDir, 'simulate.jsx');

const reactStubSource = `
export function useEffect() {}

const React = {
  Fragment: Symbol.for('react.fragment'),
  createElement(type, props, ...children) {
    return { type, props: props || {}, children };
  },
};

export default React;
`;

export async function loadSimulateModule() {
  const source = await readFile(sourcePath, 'utf8');
  const transformed = await transform(source, {
    loader: 'jsx',
    format: 'esm',
    jsx: 'transform',
    sourcefile: sourcePath,
  });

  const tempDir = await mkdtemp(join(tmpdir(), 'simulate-jsx-test-'));
  const stubPath = join(tempDir, 'react-test-stub.mjs');
  const modulePath = join(tempDir, 'simulate.transpiled.mjs');

  const code = transformed.code.replace(/from\s+["']react["']/g, 'from "./react-test-stub.mjs"');

  await writeFile(stubPath, reactStubSource);
  await writeFile(modulePath, code);

  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}
