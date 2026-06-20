export const SUPPORTED_BROWSER_MODULES = Object.freeze([
  {
    specifier: 'react',
    vendorFile: 'react.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'react/jsx-runtime',
    vendorFile: 'react-jsx-runtime.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'react-dom/client',
    vendorFile: 'react-dom-client.mjs',
    bundleExternal: ['react'],
  },
  {
    specifier: 'recharts',
    vendorFile: 'recharts.mjs',
    bundleExternal: ['react'],
  },
  {
    specifier: 'lucide-react',
    vendorFile: 'lucide-react.mjs',
    bundleExternal: ['react'],
  },
  {
    specifier: 'lodash',
    vendorFile: 'lodash.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'd3',
    vendorFile: 'd3.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'papaparse',
    vendorFile: 'papaparse.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'mathjs',
    vendorFile: 'mathjs.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'chart.js',
    vendorFile: 'chart-js.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'tone',
    vendorFile: 'tone.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'mammoth',
    vendorFile: 'mammoth.mjs',
    bundleExternal: [],
  },
  {
    specifier: 'shadcn/ui',
    vendorFile: 'shadcn-ui.mjs',
    bundleExternal: ['react'],
  },
]);

export const SUPPORTED_BROWSER_MODULE_SPECIFIERS = Object.freeze(
  SUPPORTED_BROWSER_MODULES.map((module) => module.specifier),
);

export function supportedModuleSpecifierSet() {
  return new Set(SUPPORTED_BROWSER_MODULE_SPECIFIERS);
}

export function browserImportMap() {
  return {
    imports: Object.fromEntries(
      SUPPORTED_BROWSER_MODULES.map((module) => [
        module.specifier,
        `/vendor/${module.vendorFile}`,
      ]),
    ),
  };
}

export function supportedModulesDescription() {
  return SUPPORTED_BROWSER_MODULE_SPECIFIERS.join(', ');
}
