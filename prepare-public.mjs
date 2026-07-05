#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

import { assertSupportedJsxImports } from './jsx-import-validator.mjs';
import { listRootJsxFiles, toManifestJson } from './manifest-files.mjs';
import { SUPPORTED_BROWSER_MODULES } from './supported-modules.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const publicDir = join(root, 'public');
const vendorDir = join(publicDir, 'vendor');
const vendorEntryDir = join(root, '.vendor-entrypoints-tmp');
const publicSourceFiles = new Set(['index.html', 'iphone.html', 'viewer-shared.mjs']);
const rootFiles = await listRootJsxFiles(root);
const manifestJson = toManifestJson(rootFiles);

function cleanGeneratedPublicAssets() {
  mkdirSync(publicDir, { recursive: true });

  const missingSourceFiles = [...publicSourceFiles].filter(
    (file) => !existsSync(join(publicDir, file)),
  );
  if (missingSourceFiles.length > 0) {
    throw new Error(
      `Missing public source file(s): ${missingSourceFiles.join(', ')}`,
    );
  }

  for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
    if (publicSourceFiles.has(entry.name)) {
      continue;
    }
    rmSync(join(publicDir, entry.name), { recursive: true, force: true });
  }
}

cleanGeneratedPublicAssets();
mkdirSync(vendorDir, { recursive: true });
mkdirSync(vendorEntryDir, { recursive: true });

const vendorEntrySources = new Map([
  ['react', `
import React from 'react';
export default React;
export const {
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
} = React;
`],
  ['react/jsx-runtime', `
import jsxRuntime from 'react/jsx-runtime';
export default jsxRuntime;
export const { Fragment, jsx, jsxs } = jsxRuntime;
`],
  ['react-dom/client', `
import client from 'react-dom/client';
export default client;
export const { createRoot, hydrateRoot } = client;
`],
  ['lodash', `
import lodash from 'lodash';
export default lodash;
export const {
  camelCase,
  capitalize,
  chunk,
  clamp,
  cloneDeep,
  debounce,
  difference,
  flatten,
  get,
  groupBy,
  isEqual,
  keyBy,
  map,
  merge,
  orderBy,
  pick,
  range,
  set,
  sortBy,
  startCase,
  throttle,
  uniq,
  uniqBy,
} = lodash;
`],
  ['papaparse', `
import Papa from 'papaparse';
export default Papa;
export const { parse, unparse } = Papa;
`],
  ['chart.js', `
import { Chart, registerables } from 'chart.js';
export * from 'chart.js';
Chart.register(...registerables);
export default Chart;
`],
  ['mammoth', `
import mammoth from 'mammoth';
export default mammoth;
export const {
  convert,
  convertToHtml,
  convertToMarkdown,
  embedStyleMap,
  extractRawText,
  images,
  transforms,
} = mammoth;
`],
  ['shadcn/ui', `
import React from 'react';

function mergeClassNames(...values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return mergeClassNames(...value);
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([className]) => className);
    }
    return [];
  }).join(' ');
}

export const cn = mergeClassNames;

export function Button({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-zinc-900 text-white',
    secondary: 'bg-zinc-100 text-zinc-900',
    outline: 'border border-zinc-200 bg-white text-zinc-900',
    ghost: 'bg-transparent text-zinc-900',
  };
  return React.createElement('button', {
    ...props,
    className: cn(
      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
      variants[variant] || variants.default,
      className,
    ),
  });
}

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-zinc-900 text-white',
    secondary: 'bg-zinc-100 text-zinc-900',
    outline: 'border border-zinc-200 text-zinc-900',
  };
  return React.createElement('span', {
    ...props,
    className: cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', variants[variant] || variants.default, className),
  });
}

export function Card({ className, ...props }) {
  return React.createElement('section', {
    ...props,
    className: cn('rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm', className),
  });
}

export function CardHeader({ className, ...props }) {
  return React.createElement('div', { ...props, className: cn('flex flex-col gap-1.5 p-6', className) });
}

export function CardTitle({ className, ...props }) {
  return React.createElement('h3', { ...props, className: cn('text-lg font-semibold leading-tight', className) });
}

export function CardDescription({ className, ...props }) {
  return React.createElement('p', { ...props, className: cn('text-sm text-zinc-500', className) });
}

export function CardContent({ className, ...props }) {
  return React.createElement('div', { ...props, className: cn('p-6 pt-0', className) });
}

export function CardFooter({ className, ...props }) {
  return React.createElement('div', { ...props, className: cn('flex items-center p-6 pt-0', className) });
}

export function Input({ className, ...props }) {
  return React.createElement('input', {
    ...props,
    className: cn('flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm', className),
  });
}

export function Label({ className, ...props }) {
  return React.createElement('label', { ...props, className: cn('text-sm font-medium leading-tight', className) });
}
`],
]);

function vendorEntryPointFor(module) {
  const source = vendorEntrySources.get(module.specifier);
  if (!source) return module.specifier;

  const entryFile = join(vendorEntryDir, `${module.vendorFile}.entry.mjs`);
  writeFileSync(entryFile, source.trimStart());
  return entryFile;
}

function vendorBannerFor(module) {
  if (!module.bundleExternal.includes('react')) return undefined;

  return {
    js: [
      'import __gptOutputsReact from "react";',
      'var require = (name) => {',
      '  if (name === "react") return __gptOutputsReact;',
      '  throw new Error(`Dynamic require of "${name}" is not supported`);',
      '};',
    ].join('\n'),
  };
}

async function vendorBrowserModules() {
  try {
    await Promise.all(
      SUPPORTED_BROWSER_MODULES.map((module) =>
        build({
          entryPoints: [vendorEntryPointFor(module)],
          outfile: join(vendorDir, module.vendorFile),
          bundle: true,
          format: 'esm',
          platform: 'browser',
          target: 'es2020',
          absWorkingDir: root,
          external: module.bundleExternal,
          banner: vendorBannerFor(module),
          logLevel: 'silent',
        })
      )
    );
  } finally {
    rmSync(vendorEntryDir, { recursive: true, force: true });
  }

  copyFileSync(require.resolve('@babel/standalone/babel.min.js'), join(vendorDir, 'babel.min.js'));
  copyFileSync(require.resolve('@babel/standalone/babel.min.js.map'), join(vendorDir, 'babel.min.js.map'));

  // Copy the Tailwind-compatible utility stylesheet for uploaded JSX components
  copyFileSync(join(root, 'vendor', 'uploaded-jsx-utilities.css'), join(vendorDir, 'uploaded-jsx-utilities.css'));
}

writeFileSync(join(publicDir, 'jsx-manifest.json'), manifestJson);

const seen = new Set();
const queue = [...rootFiles];

const localImportPatterns = [
  /\bimport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
  /\bexport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
  /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
];

function enqueueLocalImports(relativeFile) {
  const absFile = join(root, relativeFile);
  if (seen.has(absFile)) {
    return;
  }
  seen.add(absFile);

  const source = readFileSync(absFile, 'utf8');
  if (relativeFile.endsWith('.jsx')) {
    assertSupportedJsxImports(source, { file: relativeFile });
  }

  const destination = join(publicDir, relativeFile);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(absFile, destination);

  for (const pattern of localImportPatterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      const resolved = resolve(dirname(absFile), specifier);
      if (!resolved.startsWith(root)) {
        continue;
      }
      const relativeResolved = resolved.slice(root.length + 1);
      const ext = extname(relativeResolved);
      if (ext === '.mjs' || ext === '.jsx') {
        queue.push(relativeResolved);
      }
    }
  }
}

while (queue.length > 0) {
  const relativeFile = queue.shift();
  enqueueLocalImports(relativeFile);
}

await vendorBrowserModules();
