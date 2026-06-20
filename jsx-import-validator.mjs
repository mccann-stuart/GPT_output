import { supportedModuleSpecifierSet, supportedModulesDescription } from './supported-modules.mjs';

const IMPORT_SPECIFIER_PATTERN =
  /\bimport\s+(?:[^'"]*?\s+from\s*)?['"]([^'"]+)['"]|\bexport\s+[^'"]*?\s+from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function isBareSpecifier(specifier) {
  return !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.includes('://') &&
    !specifier.startsWith('#');
}

export function findJsxImportSpecifiers(source) {
  return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)].map((match) => match[1] || match[2] || match[3]);
}

export function findUnsupportedJsxImports(source, { allowedModules } = {}) {
  const modules = allowedModules ?? supportedModuleSpecifierSet();
  const unsupported = new Set();
  for (const specifier of findJsxImportSpecifiers(source)) {
    if (isBareSpecifier(specifier) && !modules.has(specifier)) {
      unsupported.add(specifier);
    }
  }
  return [...unsupported].sort();
}

export function assertSupportedJsxImports(source, { file = 'uploaded JSX', allowedModules } = {}) {
  const unsupported = findUnsupportedJsxImports(source, { allowedModules });
  if (unsupported.length === 0) return;

  const plural = unsupported.length === 1 ? 'import' : 'imports';
  throw new Error(
    `${file} uses unsupported bare ${plural}: ${unsupported.join(', ')}. ` +
      `Supported modules: ${supportedModulesDescription()}. ` +
      'Use a relative ./file.mjs import for local logic.',
  );
}
