import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function readViewer(file) {
  return readFileSync(join(root, "public", file), "utf8");
}

test("iPhone and desktop viewers import initViewer from viewer-shared.mjs, which contains the R2 logic", () => {
  const desktopHtml = readViewer("index.html");
  const iphoneHtml = readViewer("iphone.html");
  const sharedJs = readViewer("viewer-shared.mjs");

  // Verify pages import the shared viewer module
  assert.match(
    desktopHtml,
    /import\s+.*initViewer.*\s+from\s+['"]\.\/viewer-shared\.mjs['"]/,
  );
  assert.match(
    iphoneHtml,
    /import\s+.*initViewer.*\s+from\s+['"]\.\/viewer-shared\.mjs['"]/,
  );

  // Verify pages do not contain raw upload status label references directly
  assert.doesNotMatch(desktopHtml, /\(uploaded\)/);
  assert.doesNotMatch(iphoneHtml, /\(uploaded\)/);

  // Verify the shared file contains the manifest fetching and R2 logic
  for (const expected of [
    "fetchUploadedManifest",
    "/api/upload-manifest",
    "const FILE_SOURCES = new Map()",
    'FILE_SOURCES.set(file, "r2")',
    "/jsxupload/Files/",
  ]) {
    assert.match(
      sharedJs,
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("viewer controls are opened through shortcuts rather than a visible desktop open button", () => {
  const desktopHtml = readViewer("index.html");
  const iphoneHtml = readViewer("iphone.html");
  const sharedJs = readViewer("viewer-shared.mjs");

  assert.doesNotMatch(desktopHtml, /Open Controls|panel-toggle-btn/);
  assert.match(iphoneHtml, /panel-toggle-btn/);

  assert.match(sharedJs, /window\.addEventListener\(\s*"keydown"/);
  assert.match(sharedJs, /event\.altKey/);
  assert.match(sharedJs, /event\.code === "KeyD"/);
  assert.match(sharedJs, /isSafariBrowser\(\)/);
  assert.match(sharedJs, /event\.ctrlKey/);
});

test("viewer shells configure Google Analytics without automatic page views", () => {
  const desktopHtml = readViewer("index.html");
  const iphoneHtml = readViewer("iphone.html");
  const gaScript =
    /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-HFPWB2XVCM/;
  const disabledPageView =
    /gtag\('config', 'G-HFPWB2XVCM', \{ send_page_view: false \}\);/;

  assert.match(desktopHtml, gaScript);
  assert.match(iphoneHtml, gaScript);
  assert.match(desktopHtml, disabledPageView);
  assert.match(iphoneHtml, disabledPageView);
});
