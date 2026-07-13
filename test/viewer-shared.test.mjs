import test from "node:test";
import assert from "node:assert/strict";
import {
  GA_MEASUREMENT_ID,
  HISTORY_REPLACE_MIN_INTERVAL_MS,
  analyticsParamsForViewer,
  browserTitleForFile,
  faviconColorForFile,
  faviconInitialsForFile,
  isSafeObjectKey,
  isAllowedManifestFile,
  truncateMiddle,
  isPlainObject,
  deepClone,
  deepEqual,
  applyOverrides,
  diffFromDefaults,
  encodeBase64Url,
  decodeBase64Url,
  parseSharedState,
  isSafeUploadFileName,
  sanitizedAnalyticsUrlParts,
  viewerTypeForMobile,
  createHistoryReplaceScheduler,
  addDeviceMotionPermissionTapHandler,
} from "../public/viewer-shared.mjs";

test("viewer analytics helpers expose the configured measurement id", () => {
  assert.equal(GA_MEASUREMENT_ID, "G-HFPWB2XVCM");
});

test("viewerTypeForMobile maps viewer shells to analytics view types", () => {
  assert.equal(viewerTypeForMobile(true), "iphone");
  assert.equal(viewerTypeForMobile(false), "desktop");
});

test("history replacement accepts 10,000 updates in 10 seconds without exceeding the browser quota", () => {
  let currentTime = 0;
  let nextTimerId = 0;
  let scheduledTimer = null;
  const writes = [];
  const historyLike = {
    replaceState(_state, _unused, url) {
      writes.push({ at: currentTime, url });
    },
  };
  const scheduler = createHistoryReplaceScheduler(historyLike, {
    now: () => currentTime,
    setTimer(callback, delay) {
      const timer = {
        id: ++nextTimerId,
        callback,
        dueAt: currentTime + delay,
      };
      scheduledTimer = timer;
      return timer.id;
    },
    clearTimer(timerId) {
      if (scheduledTimer?.id === timerId) scheduledTimer = null;
    },
  });

  function advanceTo(targetTime) {
    while (scheduledTimer && scheduledTimer.dueAt <= targetTime) {
      const timer = scheduledTimer;
      scheduledTimer = null;
      currentTime = timer.dueAt;
      timer.callback();
    }
    currentTime = targetTime;
  }

  for (let update = 0; update < 10_000; update += 1) {
    advanceTo(update);
    scheduler.schedule(`https://example.test/?state=${update}`);
  }
  advanceTo(10_000);

  assert.equal(HISTORY_REPLACE_MIN_INTERVAL_MS, 125);
  assert.ok(
    writes.length < 100,
    `expected fewer than 100 writes, got ${writes.length}`,
  );
  assert.equal(writes.at(-1).url, "https://example.test/?state=9999");
  const completedWriteCount = writes.length;
  advanceTo(10_001);
  scheduler.schedule("https://example.test/?state=stale");
  scheduler.cancel();
  advanceTo(10_125);
  assert.equal(writes.length, completedWriteCount);
  writes.forEach((write, index) => {
    const writesInPreviousTenSeconds = writes
      .slice(0, index + 1)
      .filter((candidate) => candidate.at >= write.at - 10_000);
    assert.ok(writesInPreviousTenSeconds.length < 100);
  });
});

test("device motion permission is requested from a click activation", async () => {
  const listeners = new Map();
  const target = {
    addEventListener(type, handler, options) {
      listeners.set(type, { handler, options });
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  let permissionRequests = 0;
  let listenCalls = 0;

  addDeviceMotionPermissionTapHandler({
    target,
    motionEvent: {
      requestPermission() {
        permissionRequests += 1;
        return Promise.resolve("granted");
      },
    },
    startListening() {
      listenCalls += 1;
    },
    onError: assert.fail,
  });

  assert.equal(listeners.has("click"), true);
  assert.equal(listeners.has("touchstart"), false);
  assert.deepEqual(listeners.get("click").options, {
    capture: true,
    once: true,
  });

  listeners.get("click").handler();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(permissionRequests, 1);
  assert.equal(listenCalls, 1);
  assert.equal(listeners.has("click"), false);
});

test("device motion listener starts immediately when no permission API exists", () => {
  let listenCalls = 0;

  addDeviceMotionPermissionTapHandler({
    target: {
      addEventListener() {
        assert.fail("listener should not be registered without permission API");
      },
    },
    motionEvent: {},
    startListening() {
      listenCalls += 1;
    },
  });

  assert.equal(listenCalls, 1);
});

test("sanitizedAnalyticsUrlParts strips shared state from analytics URLs", () => {
  assert.deepEqual(
    sanitizedAnalyticsUrlParts(
      "https://example.test/iphone.html?file=Deck.jsx&state=opaque&desktop=1#page",
    ),
    {
      page_location:
        "https://example.test/iphone.html?file=Deck.jsx&desktop=1#page",
      page_path: "/iphone.html?file=Deck.jsx&desktop=1#page",
    },
  );
});

test("analyticsParamsForViewer builds compact common event parameters", () => {
  assert.deepEqual(
    analyticsParamsForViewer({
      urlLike:
        "https://example.test/index.html?file=Deck.jsx&state=opaque",
      viewerType: "desktop",
      fileName: "Deck.jsx",
      fileSource: "r2",
      extraParams: {
        upload_file_count: 2,
        ignored_empty: "",
      },
    }),
    {
      page_location: "https://example.test/index.html?file=Deck.jsx",
      page_path: "/index.html?file=Deck.jsx",
      route_path: "/index.html?file=Deck.jsx",
      viewer_type: "desktop",
      file_name: "Deck.jsx",
      file_source: "r2",
      upload_file_count: 2,
    },
  );
});

test("browser metadata helpers derive tab title and favicon identity from JSX filenames", () => {
  assert.equal(
    browserTitleForFile("MortgageRatePredictor.jsx"),
    "MortgageRatePredictor.jsx",
  );
  assert.equal(browserTitleForFile(""), "JSX Viewer");

  assert.equal(faviconInitialsForFile("MortgageRatePredictor.jsx"), "MR");
  assert.equal(faviconInitialsForFile("SierraScenarioModel.jsx"), "SS");
  assert.equal(faviconInitialsForFile("runway-model_v2.jsx"), "RM");
  assert.equal(faviconInitialsForFile("a.jsx"), "A");

  assert.match(
    faviconColorForFile("MortgageRatePredictor.jsx"),
    /^hsl\(\d{1,3}, 58%, 34%\)$/,
  );
});

test("isSafeObjectKey blocks prototype pollution keys", () => {
  assert.equal(isSafeObjectKey("__proto__"), false);
  assert.equal(isSafeObjectKey("prototype"), false);
  assert.equal(isSafeObjectKey("constructor"), false);
  assert.equal(isSafeObjectKey("normalKey"), true);
  assert.equal(isSafeObjectKey("length"), true);
});

test("isAllowedManifestFile checks for valid JSX filenames", () => {
  assert.equal(isAllowedManifestFile("test.jsx"), true);
  assert.equal(isAllowedManifestFile("App-123.jsx"), true);
  assert.equal(isAllowedManifestFile("my_component.jsx"), true);

  // Rejects non-jsx
  assert.equal(isAllowedManifestFile("test.js"), false);
  assert.equal(isAllowedManifestFile("test.mjs"), false);

  // Rejects unsafe names
  assert.equal(isAllowedManifestFile("../test.jsx"), false);
  assert.equal(isAllowedManifestFile("/etc/passwd.jsx"), false);
  assert.equal(isAllowedManifestFile(" test.jsx"), false);

  // Rejects non-strings
  assert.equal(isAllowedManifestFile(null), false);
  assert.equal(isAllowedManifestFile(123), false);
  assert.equal(isAllowedManifestFile({}), false);
});

test("truncateMiddle shortens text with ellipsis in the middle", () => {
  assert.equal(truncateMiddle("1234567890", 10), "1234567890");
  assert.equal(truncateMiddle("1234567890", 9), "1234...90");
  assert.equal(truncateMiddle("1234567890", 8), "1234...0");
  assert.equal(truncateMiddle("1234567890", 7), "123...0");
  assert.equal(truncateMiddle("1234567890", 6), "12...0");
  assert.equal(truncateMiddle("1234567890", 3), "123");
  assert.equal(truncateMiddle("123", 5), "123");
});

test("isPlainObject correctly identifies plain objects", () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject({ a: 1 }), true);

  // Excludes arrays, nulls, primitives
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(123), false);
  assert.equal(isPlainObject("string"), false);
  assert.equal(isPlainObject(true), false);
  assert.equal(isPlainObject(undefined), false);
});

test("deepClone creates independent copies of nested objects and arrays", () => {
  const original = {
    a: 1,
    b: { c: [1, 2, { d: 3 }] },
  };
  const cloned = deepClone(original);

  assert.deepEqual(cloned, original);
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.b, original.b);
  assert.notEqual(cloned.b.c, original.b.c);
  assert.notEqual(cloned.b.c[2], original.b.c[2]);

  // Modifying clone doesn't affect original
  cloned.b.c[2].d = 4;
  assert.equal(original.b.c[2].d, 3);
  assert.equal(cloned.b.c[2].d, 4);
});

test("deepClone ignores unsafe keys", () => {
  const obj = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}');
  const cloned = deepClone(obj);
  assert.equal(cloned.a, 1);
  assert.equal(Object.keys(cloned).includes("__proto__"), false);
});

test("deepEqual correctly compares objects and arrays", () => {
  assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
  assert.equal(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }), true);

  // Different lengths
  assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);

  // Different values
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);

  // Different types
  assert.equal(deepEqual({ a: 1 }, null), false);
  assert.equal(deepEqual([1, 2], { 0: 1, 1: 2 }), false);
});

test("applyOverrides deeply merges two plain objects", () => {
  const defaults = { a: 1, b: { c: 2, d: 3 }, e: [1, 2] };
  const overrides = { b: { c: 99 }, e: [3, 4], f: "new" };
  const merged = applyOverrides(defaults, overrides);

  assert.deepEqual(merged, {
    a: 1,
    b: { c: 99, d: 3 },
    e: [3, 4],
    f: "new",
  });
});

test("applyOverrides returns original default clone if override is undefined", () => {
  const defaults = { a: 1 };
  const result = applyOverrides(defaults, undefined);
  assert.deepEqual(result, defaults);
  assert.notEqual(result, defaults);
});

test("applyOverrides replaces non-plain objects entirely", () => {
  assert.deepEqual(applyOverrides([1, 2], [3, 4]), [3, 4]);
  assert.deepEqual(applyOverrides({ a: 1 }, "string"), "string");
  assert.deepEqual(applyOverrides("string", { a: 1 }), { a: 1 });
});

test("diffFromDefaults calculates minimum object to recreate state from defaults", () => {
  const defaults = { a: 1, b: { c: 2, d: 3 } };

  // No diff
  assert.equal(diffFromDefaults({ a: 1, b: { c: 2, d: 3 } }, defaults), undefined);

  // Partial diff
  assert.deepEqual(
    diffFromDefaults({ a: 1, b: { c: 99, d: 3 } }, defaults),
    { b: { c: 99 } }
  );

  // New keys
  assert.deepEqual(
    diffFromDefaults({ a: 1, b: { c: 2, d: 3 }, e: 4 }, defaults),
    { e: 4 }
  );

  // Type mismatch
  assert.deepEqual(diffFromDefaults("string", defaults), "string");

  // Arrays are cloned wholly if different
  assert.deepEqual(diffFromDefaults([1, 2], [1, 2]), undefined);
  assert.deepEqual(diffFromDefaults([1, 2], [1, 3]), [1, 2]);
});

test("encodeBase64Url and decodeBase64Url correctly roundtrip JSON", () => {
  const original = { file: "test.jsx", overrides: { theme: "dark" } };
  const encoded = encodeBase64Url(original);

  // Encoded should be a string, without + / or =
  assert.equal(typeof encoded, "string");
  assert.equal(encoded.includes("+"), false);
  assert.equal(encoded.includes("/"), false);
  assert.equal(encoded.includes("="), false);

  const decoded = decodeBase64Url(encoded);
  assert.deepEqual(decoded, original);
});

test("parseSharedState handles valid and invalid encoded states", () => {
  const validState = { file: "test.jsx", overrides: { a: 1 } };
  const encodedValid = encodeBase64Url(validState);

  assert.deepEqual(parseSharedState(encodedValid), validState);

  // Handles empty overrides
  const minimalState = { file: "test.jsx" };
  const encodedMinimal = encodeBase64Url(minimalState);
  assert.deepEqual(parseSharedState(encodedMinimal), { file: "test.jsx", overrides: {} });

  // Rejects bad input
  assert.equal(parseSharedState(null), null);
  assert.equal(parseSharedState(""), null);
  assert.equal(parseSharedState("invalid-base64"), null);

  // Rejects missing file string
  const missingFile = encodeBase64Url({ overrides: { a: 1 } });
  assert.equal(parseSharedState(missingFile), null);
});

test("isSafeUploadFileName checks upload extensions and formats", () => {
  // Valid .jsx
  assert.equal(isSafeUploadFileName("App.jsx"), true);
  assert.equal(isSafeUploadFileName("my-app_123.jsx"), true);

  // Valid .mjs
  assert.equal(isSafeUploadFileName("utils.mjs"), true);
  assert.equal(isSafeUploadFileName("shared-logic.mjs"), true);

  // Rejects invalid extensions
  assert.equal(isSafeUploadFileName("App.js"), false);
  assert.equal(isSafeUploadFileName("App.ts"), false);
  assert.equal(isSafeUploadFileName("App.jsx.txt"), false);

  // Rejects unsafe paths
  assert.equal(isSafeUploadFileName("../App.jsx"), false);
  assert.equal(isSafeUploadFileName("/root/App.jsx"), false);

  // Rejects bad formats
  assert.equal(isSafeUploadFileName(".jsx"), false);
  assert.equal(isSafeUploadFileName(" App.jsx"), false);
  assert.equal(isSafeUploadFileName(null), false);
});
