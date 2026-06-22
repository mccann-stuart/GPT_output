import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { transform } from "esbuild";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(rootDir, "MortgageRatePredictor.jsx");

const reactStubSource = `
export function useState(initialValue) {
  const index = globalThis.__mortgageRateStateIndex || 0;
  const overrides = globalThis.__mortgageRateStateOverrides || {};
  globalThis.__mortgageRateStateIndex = index + 1;
  return [Object.hasOwn(overrides, index) ? overrides[index] : initialValue, () => {}];
}

export function useMemo(factory) {
  return factory();
}

export function useEffect() {}

const React = {
  Fragment: Symbol.for("react.fragment"),
  createElement(type, props, ...children) {
    if (typeof type === "function") {
      return type({ ...(props || {}), children });
    }
    return { type, props: { ...(props || {}), children } };
  },
};

export default React;
`;

async function loadMortgageRatePredictor() {
  const source = await readFile(sourcePath, "utf8");
  const transformed = await transform(source, {
    loader: "jsx",
    format: "esm",
    jsx: "transform",
    sourcefile: sourcePath,
  });

  const tempDir = await mkdtemp(join(tmpdir(), "mortgage-rate-predictor-test-"));
  const stubPath = join(tempDir, "react-test-stub.mjs");
  const modulePath = join(tempDir, "MortgageRatePredictor.transpiled.mjs");
  const code = transformed.code.replace(/from\s+["']react["']/g, 'from "./react-test-stub.mjs"');

  await writeFile(stubPath, reactStubSource);
  await writeFile(modulePath, code);

  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

function render(Component, stateOverrides = {}) {
  globalThis.__mortgageRateStateIndex = 0;
  globalThis.__mortgageRateStateOverrides = stateOverrides;
  return Component();
}

function collectText(node, acc = []) {
  if (node === null || node === undefined || typeof node === "boolean") return acc;
  if (typeof node === "string" || typeof node === "number") {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, acc);
    return acc;
  }
  if (typeof node === "object") {
    collectText(node.props?.children, acc);
  }
  return acc;
}

test("mortgage predictor defaults to the low-LTV best-buy rate stack", async () => {
  const { default: MortgageRatePredictor } = await loadMortgageRatePredictor();
  const text = collectText(render(MortgageRatePredictor)).join(" ");

  assert.match(text, /Modelled rate today\s+4\.54\s*%/);
  assert.match(text, /Predicted · 12 months\s+4\.58\s*%/);
  assert.match(text, /5-year fix · sub-60% LTV best-buy/);
  assert.doesNotMatch(text, /Modelled rate today\s+5\.58\s*%/);
});

test("mortgage predictor APRC explainer uses the current headline rate", async () => {
  const { default: MortgageRatePredictor } = await loadMortgageRatePredictor();
  // Hook index 4 is the APRC section open state.
  const text = collectText(render(MortgageRatePredictor, { 4: true })).join(" ");

  assert.match(text, /Headline Interest Rate\s+The contract rate .*4\.54\s*%/);
  assert.match(text, /Why\s+4\.54\s*%\s+can become\s+5\.70\s*%\s+APRC/);
  assert.doesNotMatch(text, /Solving the 4\.3\s*%\s+APRC Puzzle/);
});
