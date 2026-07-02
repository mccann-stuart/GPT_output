import test from 'node:test';
import assert from 'node:assert/strict';

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertSupportedJsxImports } from '../jsx-import-validator.mjs';
import { browserImportMap, SUPPORTED_BROWSER_MODULE_SPECIFIERS } from '../supported-modules.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function importMapFromHtml(html) {
  const match = html.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'expected an import map script');
  return JSON.parse(match[1]);
}

test('desktop and iPhone import maps are equivalent and cover every supported module', async () => {
  const [desktopHtml, iphoneHtml] = await Promise.all([
    readFile(join(rootDir, 'public', 'index.html'), 'utf8'),
    readFile(join(rootDir, 'public', 'iphone.html'), 'utf8'),
  ]);

  const expectedImportMap = browserImportMap();
  const desktopImportMap = importMapFromHtml(desktopHtml);
  const iphoneImportMap = importMapFromHtml(iphoneHtml);

  assert.deepEqual(desktopImportMap, expectedImportMap);
  assert.deepEqual(iphoneImportMap, expectedImportMap);
  assert.deepEqual(Object.keys(desktopImportMap.imports).sort(), [...SUPPORTED_BROWSER_MODULE_SPECIFIERS].sort());

  for (const target of Object.values(desktopImportMap.imports)) {
    assert.match(target, /^\/vendor\/.+\.mjs$/);
  }
});

test('JSX import validator accepts supported bare modules and relative imports', () => {
  assert.doesNotThrow(() => assertSupportedJsxImports(`
    import React from 'react';
    import { jsx } from 'react/jsx-runtime';
    import { createRoot } from 'react-dom/client';
    import { LineChart } from 'recharts';
    import { BadgeCheck } from 'lucide-react';
    import _ from 'lodash';
    import * as d3 from 'd3';
    import Papa from 'papaparse';
    import { evaluate } from 'mathjs';
    import Chart from 'chart.js';
    import * as Tone from 'tone';
    import mammoth from 'mammoth';
    import { Button } from 'shadcn/ui';
    import { value } from './logic.mjs';
    export default function Fixture() {
      return React.createElement(BadgeCheck, { size: 16 });
    }
  `, { file: 'fixture.jsx' }));
});

test('JSX import validator accepts common React hooks and lucide dashboard icons', () => {
  assert.doesNotThrow(() => assertSupportedJsxImports(`
    import React, { useMemo, useState, useCallback } from 'react';
    import {
      Activity,
      AlertTriangle,
      AppWindow,
      Banknote,
      BarChart3,
      BrainCircuit,
      Calculator,
      ChevronsDownUp,
      ChevronsUpDown,
      Cloud,
      Cpu,
      Filter,
      Info,
      LineChart,
      Minus,
      Network,
      Server,
      ShieldCheck,
      TrendingDown,
      TrendingUp,
      Users
    } from 'lucide-react';

    export default function DashboardIcons() {
      const icons = useMemo(() => [Activity, AlertTriangle, AppWindow], []);
      const [expanded, setExpanded] = useState(false);
      const toggle = useCallback(() => setExpanded((value) => !value), []);
      return React.createElement(icons[0], { 'data-expanded': expanded, onClick: toggle });
    }
  `, { file: 'dashboard-icons.jsx' }));
});

test('JSX import validator rejects unsupported bare imports with a clear message', () => {
  assert.throws(
    () => assertSupportedJsxImports(`
      import thing from 'unsupported-package';
      export { other } from '@scope/other';
      import('./local.mjs');
    `, { file: 'bad.jsx' }),
    /bad\.jsx uses unsupported bare imports: @scope\/other, unsupported-package.*Supported modules:.*shadcn\/ui/s,
  );
});
