import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { transform } from "esbuild";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(rootDir, "ConversationalAIFunding.jsx");

const reactStubSource = `
export function useState(initialValue) {
  return [initialValue, () => {}];
}

export function useMemo(factory) {
  return factory();
}

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

async function loadConversationalAIFunding() {
  const source = await readFile(sourcePath, "utf8");
  const transformed = await transform(source, {
    loader: "jsx",
    format: "esm",
    jsx: "transform",
    sourcefile: sourcePath,
  });

  const tempDir = await mkdtemp(join(tmpdir(), "conversational-ai-funding-test-"));
  const stubPath = join(tempDir, "react-test-stub.mjs");
  const modulePath = join(tempDir, "ConversationalAIFunding.transpiled.mjs");
  const code = transformed.code.replace(/from\s+["']react["']/g, 'from "./react-test-stub.mjs"');

  await writeFile(stubPath, reactStubSource);
  await writeFile(modulePath, code);

  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
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

function findButtonByText(node, text) {
  if (node === null || node === undefined || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByText(child, text);
      if (found) return found;
    }
    return null;
  }
  const nodeText = collectText(node).join(" ");
  if (node.type === "button" && nodeText.includes(text)) {
    return node;
  }
  return findButtonByText(node.props?.children, text);
}

function findInputByValue(node, value) {
  if (node === null || node === undefined || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findInputByValue(child, value);
      if (found) return found;
    }
    return null;
  }
  if (node.type === "input" && node.props?.value === value) {
    return node;
  }
  return findInputByValue(node.props?.children, value);
}

test("funding tracker restores a shared Runway Scenarios view", async () => {
  const { default: ConversationalAIFunding } = await loadConversationalAIFunding();
  const tree = ConversationalAIFunding({
    initialSettings: {
      view: "runway",
      runwayScenario: {
        marginIdx: 3,
        growthIdx: 2,
        horizonIdx: 0,
        burnIdxByCompany: {
          sierra: 3,
          decagon: 2,
          parloa: 1,
          polyai: 0,
        },
      },
    },
  });
  const text = collectText(tree).join(" ");

  assert.match(text, /Scenario Matrix/);
  assert.match(text, /Revenue offset model at\s+95\s+%\s+gross margin/);
  assert.match(text, /3\s+-year view assumes the current ARR base grows at\s+50%\s+per year/);
});

test("funding tracker emits viewer settings for shareable runway links", async () => {
  const { default: ConversationalAIFunding } = await loadConversationalAIFunding();
  const emitted = [];
  const tree = ConversationalAIFunding({
    onSettingsChange: (settings) => emitted.push(settings),
  });

  findButtonByText(tree, "Runway Scenarios").props.onClick();
  assert.equal(emitted.at(-1).view, "runway");

  const runwayTree = ConversationalAIFunding({
    initialSettings: emitted.at(-1),
    onSettingsChange: (settings) => emitted.push(settings),
  });
  findInputByValue(runwayTree, 2).props.onChange({ target: { value: "3" } });

  assert.equal(emitted.at(-1).view, "runway");
  assert.equal(emitted.at(-1).runwayScenario.marginIdx, 3);
});
