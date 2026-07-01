import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const preparePublicPath = join(rootDir, 'prepare-public.mjs');
const tmpModulePath = join(rootDir, 'test', '.tmp-shadcn-ui.mjs');

let shadcnModule;

before(async () => {
  const preparePublicSource = readFileSync(preparePublicPath, 'utf8');

  const match = preparePublicSource.match(/\['shadcn\/ui',\s*`([\s\S]*?)`\],/);
  assert.ok(match, 'expected to find shadcn/ui module string in prepare-public.mjs');

  let sourceCode = match[1];
  sourceCode = `import * as React from 'react';\n` + sourceCode.replace(/import React from 'react';/, '');

  writeFileSync(tmpModulePath, sourceCode);

  shadcnModule = await import('./.tmp-shadcn-ui.mjs');
});

after(() => {
  rmSync(tmpModulePath, { force: true });
});

test('module is loaded', () => {
  assert.ok(shadcnModule.cn);
  assert.ok(shadcnModule.Button);
});

test('cn merges class names correctly', () => {
  const { cn } = shadcnModule;

  assert.equal(cn('a', 'b'), 'a b');
  assert.equal(cn('a', 'b', 'c'), 'a b c');
  assert.equal(cn('a', null, 'b', undefined, false, '', 'c'), 'a b c');
  assert.equal(cn(['a', 'b'], 'c', ['d', null, 'e']), 'a b c d e');
  assert.equal(cn('a', { b: true, c: false, d: true }), 'a b d');
  assert.equal(cn('a', ['b', { c: true, d: null }], false, { e: true }), 'a b c e');
});

test('Button renders with default and custom variants', () => {
  const { Button } = shadcnModule;

  const defaultBtn = Button({ children: 'Click' });
  const html = renderToString(defaultBtn);
  assert.match(html, /<button/);
  assert.match(html, /inline-flex/);
  assert.match(html, /bg-zinc-900/);
  assert.match(html, /Click<\/button>/);
});

test('Badge renders with default and custom variants', () => {
  const { Badge } = shadcnModule;

  const defaultBadge = Badge({ children: 'New' });
  const html = renderToString(defaultBadge);
  assert.match(html, /<span/);
  assert.match(html, /inline-flex/);
  assert.match(html, /bg-zinc-900/);
  assert.match(html, /New<\/span>/);
});

test('Card components render correctly', () => {
  const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = shadcnModule;

  const cardHtml = renderToString(Card({ className: 'my-card' }));
  assert.match(cardHtml, /<section/);
  assert.match(cardHtml, /border-zinc-200/);
  assert.match(cardHtml, /my-card/);

  const headerHtml = renderToString(CardHeader({ className: 'my-header' }));
  assert.match(headerHtml, /<div/);
  assert.match(headerHtml, /my-header/);

  const titleHtml = renderToString(CardTitle({ className: 'my-title' }));
  assert.match(titleHtml, /<h3/);
  assert.match(titleHtml, /my-title/);

  const descHtml = renderToString(CardDescription({ className: 'my-desc' }));
  assert.match(descHtml, /<p/);
  assert.match(descHtml, /my-desc/);

  const contentHtml = renderToString(CardContent({ className: 'my-content' }));
  assert.match(contentHtml, /<div/);
  assert.match(contentHtml, /my-content/);

  const footerHtml = renderToString(CardFooter({ className: 'my-footer' }));
  assert.match(footerHtml, /<div/);
  assert.match(footerHtml, /my-footer/);
});

test('Input and Label render correctly', () => {
  const { Input, Label } = shadcnModule;

  const inputHtml = renderToString(Input({ className: 'my-input', type: 'text' }));
  assert.match(inputHtml, /<input/);
  assert.match(inputHtml, /type="text"/);
  assert.match(inputHtml, /my-input/);

  const labelHtml = renderToString(Label({ className: 'my-label', htmlFor: 'input-1', children: 'Label' }));
  assert.match(labelHtml, /<label/);
  assert.match(labelHtml, /for="input-1"/);
  assert.match(labelHtml, /my-label/);
  assert.match(labelHtml, /Label<\/label>/);
});
