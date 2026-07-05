import babel from '@babel/standalone';
import { supportedModuleSpecifierSet, supportedModulesDescription } from './supported-modules.mjs';

function isBareSpecifier(specifier) {
  return !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.includes('://') &&
    !specifier.startsWith('#');
}

function findJsxImportSpecifiers(source) {
  let ast;
  try {
    ast = babel.packages.parser.parse(source, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (error) {
    // If it fails to parse as JS/JSX, throw to prevent fail-open bypasses.
    throw new Error(`Failed to parse JSX: ${error.message}`);
  }

  const imports = [];
  babel.packages.traverse.default(ast, {
    ImportDeclaration(path) {
      imports.push(path.node.source.value);
    },
    ExportNamedDeclaration(path) {
      if (path.node.source) {
        imports.push(path.node.source.value);
      }
    },
    ExportAllDeclaration(path) {
      imports.push(path.node.source.value);
    },
    CallExpression(path) {
      if (path.node.callee.type === 'Import') {
        if (path.node.arguments[0] && path.node.arguments[0].type === 'StringLiteral') {
          imports.push(path.node.arguments[0].value);
        }
      }
    }
  });

  return imports;
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
