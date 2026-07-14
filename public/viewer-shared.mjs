import React from "react";
import { createRoot } from "react-dom/client";

export { GA_MEASUREMENT_ID, viewerTypeForMobile, sanitizedAnalyticsUrlParts, analyticsParamsForViewer } from "./viewer-analytics.mjs";
export { browserTitleForFile, faviconInitialsForFile, faviconColorForFile } from "./viewer-metadata.mjs";
export { SHARE_PARAM, MAX_SHARED_STATE_LENGTH, HISTORY_REPLACE_MIN_INTERVAL_MS, createHistoryReplaceScheduler, encodeBase64Url, decodeBase64Url, parseSharedState } from "./viewer-state.mjs";
export { isSafeObjectKey, isAllowedManifestFile, truncateMiddle, isPlainObject, deepClone, deepEqual, applyOverrides, diffFromDefaults, isSafeUploadFileName } from "./viewer-utils.mjs";
export { addDeviceMotionPermissionTapHandler } from "./viewer-ui.mjs";

import { sendAnalyticsEvent } from "./viewer-analytics.mjs";
import { browserTitleForFile, updateBrowserMetadata } from "./viewer-metadata.mjs";
import { setupClipboardCopy, setupUploadSection, setupPanelToggles, registerGlobalErrorHandlers } from "./viewer-ui.mjs";
import { isAllowedManifestFile, truncateMiddle, isPlainObject, deepClone, diffFromDefaults, applyOverrides } from "./viewer-utils.mjs";
import { parseSharedState, encodeBase64Url, SHARE_PARAM, createHistoryReplaceScheduler } from "./viewer-state.mjs";
import { viewerTypeForMobile, analyticsParamsForViewer } from "./viewer-analytics.mjs";

export async function initViewer(options = {}) {
  const {
    isMobile = false,
    defaultPageBg = "#f4f4f9",
    selectLabelMinLength = 24,
    selectLabelMaxLength = 44,
    selectLabelHorizontalChrome = 38,
    selectLabelAverageCharRatio = 0.56,
  } = options;

  const viewerType = viewerTypeForMobile(isMobile);

  registerGlobalErrorHandlers();

  // DOM Elements
  const selectEl = document.getElementById("jsx-select");
  const resetBtn = document.getElementById("reset-btn");
  const shareUrlEl = document.getElementById("share-url");
  const copyLinkBtn = document.getElementById("copy-link-btn");
  const panelToggleBtn = document.getElementById("panel-toggle-btn");
  const minimizeBtn = document.getElementById("minimize-btn");
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Root element not found");
    return;
  }
  const root = createRoot(rootElement);

  // State Variables
  let ALLOWED_FILES = [];
  const FILE_SOURCES = new Map();
  let currentFile = null;
  let currentFileSource = "static";
  let currentComponent = null;
  let currentDefaultSettings = {};
  let currentInitialSettings = {};
  let currentSettings = {};
  let currentMountKey = "";
  let renderVersion = 0;
  const historyReplaceScheduler = createHistoryReplaceScheduler(window.history);

  // Helper functions

  function trackViewerEvent(eventName, extraParams = {}) {
    sendAnalyticsEvent(
      eventName,
      analyticsParamsForViewer({
        urlLike: window.location.href,
        viewerType,
        fileName: currentFile,
        fileSource: currentFileSource,
        extraParams,
      }),
    );
  }

  function getSelectLabelMaxLength() {
    if (!selectEl) return selectLabelMaxLength;
    const rect = selectEl.getBoundingClientRect();
    if (rect.width <= 0) return selectLabelMaxLength;
    const fontSize =
      Number.parseFloat(window.getComputedStyle(selectEl).fontSize) ||
      (isMobile ? 16 : 14);
    const usableWidth = Math.max(80, rect.width - selectLabelHorizontalChrome);
    const estimatedLength = Math.floor(
      usableWidth / (fontSize * selectLabelAverageCharRatio),
    );
    return Math.max(
      selectLabelMinLength,
      Math.min(selectLabelMaxLength, estimatedLength),
    );
  }

  function fullSelectLabelForFile(filename) {
    return filename;
  }

  function displaySelectLabelForFile(
    filename,
    source,
    maxLength = selectLabelMaxLength,
  ) {
    return truncateMiddle(filename, maxLength);
  }

  function syncSelectedSelectTitle() {
    if (!selectEl) return;
    const selectedOption = selectEl.selectedOptions[0];
    selectEl.title =
      selectedOption?.dataset.fullLabel || selectedOption?.textContent || "";
  }

  function refreshSelectOptionLabels() {
    if (!selectEl) return;
    const maxLength = getSelectLabelMaxLength();
    Array.from(selectEl.options).forEach((option) => {
      const source = option.dataset.source || sourceForFile(option.value);
      option.textContent = displaySelectLabelForFile(
        option.value,
        source,
        maxLength,
      );
      option.title =
        option.dataset.fullLabel ||
        fullSelectLabelForFile(option.value, source);
    });
    syncSelectedSelectTitle();
  }

  async function fetchUploadedManifest() {
    try {
      const res = await fetch("/api/upload-manifest", {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        console.warn(
          `Failed to load uploaded manifest: ${res.status} ${res.statusText}`,
        );
        return [];
      }
      const manifest = await res.json();
      return Array.isArray(manifest.files)
        ? manifest.files.filter(isAllowedManifestFile)
        : [];
    } catch (err) {
      console.warn("Failed to load uploaded manifest:", err);
      return [];
    }
  }

  async function fetchManifest() {
    const [res, uploadedFiles] = await Promise.all([
      fetch("jsx-manifest.json"),
      fetchUploadedManifest(),
    ]);
    if (!res.ok) throw new Error("Failed to load jsx-manifest.json");
    const manifest = await res.json();
    if (!Array.isArray(manifest)) {
      throw new Error("JSX manifest must be an array");
    }
    FILE_SOURCES.clear();
    const staticFiles = manifest.filter(isAllowedManifestFile);
    staticFiles.forEach((file) => FILE_SOURCES.set(file, "static"));

    uploadedFiles.forEach((file) => FILE_SOURCES.set(file, "r2"));

    ALLOWED_FILES = [...FILE_SOURCES.keys()];
    if (ALLOWED_FILES.length === 0) {
      throw new Error("JSX manifest does not contain any loadable files");
    }
    if (selectEl) {
      selectEl.textContent = "";
      ALLOWED_FILES.forEach((f) => {
        const opt = document.createElement("option");
        const source = sourceForFile(f);
        opt.value = f;
        opt.dataset.source = source;
        opt.dataset.fullLabel = fullSelectLabelForFile(f, source);
        opt.textContent = displaySelectLabelForFile(
          f,
          source,
          getSelectLabelMaxLength(),
        );
        opt.title = opt.dataset.fullLabel;
        selectEl.appendChild(opt);
      });
      refreshSelectOptionLabels();
    }
  }

  function sourceForFile(filename) {
    return FILE_SOURCES.get(filename) || "static";
  }

  function urlForFile(filename) {
    return sourceForFile(filename) === "r2"
      ? `/jsxupload/Files/${encodeURIComponent(filename)}`
      : filename;
  }

  function getStateFromUrl(urlLike) {
    const searchParams = new URL(urlLike, window.location.origin).searchParams;
    const sharedState = parseSharedState(searchParams.get(SHARE_PARAM));
    const fileParam = searchParams.get("file");
    const defaultFile = ALLOWED_FILES[0];
    const requestedFile = sharedState?.file || fileParam || defaultFile;
    const initialFile = ALLOWED_FILES.includes(requestedFile)
      ? requestedFile
      : defaultFile;
    const initialOverrides =
      initialFile === sharedState?.file ? sharedState?.overrides || {} : {};
    return {
      initialFile,
      initialOverrides,
    };
  }

  function updateFileInputs(filename) {
    if (!selectEl) return;
    const hasOption = Array.from(selectEl.options).some(
      (opt) => opt.value === filename,
    );
    if (hasOption) {
      selectEl.value = filename;
      syncSelectedSelectTitle();
    }
  }

  function buildShareUrl() {
    const url = new URL(window.location.href);
    if (currentFile) {
      url.searchParams.set("file", currentFile);
    } else {
      url.searchParams.delete("file");
    }
    if (currentFileSource === "r2") {
      url.searchParams.set("source", "r2");
    } else {
      url.searchParams.delete("source");
      url.searchParams.delete("version");
    }
    const overrides = diffFromDefaults(currentSettings, currentDefaultSettings);
    if (overrides && Object.keys(overrides).length > 0) {
      url.searchParams.set(
        SHARE_PARAM,
        encodeBase64Url({
          file: currentFile,
          overrides,
        }),
      );
    } else {
      url.searchParams.delete(SHARE_PARAM);
    }
    return url;
  }

  function updateShareUrl({ pushHistory = false } = {}) {
    if (!currentFile) return;
    const url = buildShareUrl();
    if (shareUrlEl) {
      shareUrlEl.value = url.toString();
    }
    if (pushHistory) {
      historyReplaceScheduler.cancel();
      window.history.pushState({}, "", url);
    } else {
      historyReplaceScheduler.schedule(url);
    }
  }

  function handleSettingsChange(nextSettings) {
    if (!isPlainObject(nextSettings)) return;
    currentSettings = deepClone(nextSettings);
    updateShareUrl();
  }

  function syncPageBackgroundToComponent() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const componentRoot = rootElement.firstElementChild;
        if (!componentRoot) return;

        const computedStyles = window.getComputedStyle(componentRoot);
        const backgroundImage = computedStyles.backgroundImage;
        const backgroundColor = computedStyles.backgroundColor;
        const hasBackgroundImage =
          backgroundImage && backgroundImage !== "none";
        const hasBackgroundColor =
          backgroundColor &&
          backgroundColor !== "transparent" &&
          backgroundColor !== "rgba(0, 0, 0, 0)";

        const nextBackground = hasBackgroundImage
          ? backgroundImage
          : hasBackgroundColor
            ? backgroundColor
            : defaultPageBg;

        document.documentElement.style.setProperty(
          "--viewer-bg",
          nextBackground,
        );
      });
    });
  }

  function renderCurrentComponent() {
    if (!currentComponent) return;
    root.render(
      React.createElement(currentComponent, {
        key: currentMountKey,
        initialSettings: currentInitialSettings,
        onSettingsChange: handleSettingsChange,
      }),
    );
    syncPageBackgroundToComponent();
  }

  async function loadJSX(
    filename,
    { initialSettingsOverrides = {}, pushHistory = true } = {},
  ) {
    try {
      if (!ALLOWED_FILES.includes(filename)) {
        throw new Error(`Unauthorized file: ${filename}`);
      }

      updateBrowserMetadata(filename);
      root.render(
        React.createElement(
          "div",
          { className: "loading" },
          `Loading ${filename}...`,
        ),
      );

      const sourceUrl = urlForFile(filename);
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`,
        );
      }
      const jsxCode = await response.text();

      // Fix relative imports for blob URL
      const fileUrl = new URL(sourceUrl, window.location.href).href;
      const resolveRelativeImportsPlugin = () => {
        return {
          visitor: {
            "ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration"(path) {
              if (path.node.source && path.node.source.value.startsWith(".")) {
                path.node.source.value = new URL(path.node.source.value, fileUrl).href;
              }
            },
            CallExpression(path) {
              if (path.node.callee.type === "Import") {
                const arg = path.node.arguments[0];
                if (arg && arg.type === "StringLiteral" && arg.value.startsWith(".")) {
                  arg.value = new URL(arg.value, fileUrl).href;
                }
              }
            }
          }
        };
      };

      // Transpile using Babel
      const transpiled = Babel.transform(jsxCode, {
        presets: [
          ["react", { runtime: "automatic" }], // Use new JSX transform
        ],
        plugins: [
          resolveRelativeImportsPlugin
        ],
        filename: filename,
      }).code;

      // Create a module blob
      const blob = new Blob([transpiled], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);

      // Dynamically import the transpiled module
      const module = await import(blobUrl);

      // Cleanup blob URL
      URL.revokeObjectURL(blobUrl);

      // Render the default export
      const Component = module.default;
      if (!Component) {
        throw new Error(`No default export found in ${filename}`);
      }

      currentFile = filename;
      currentFileSource = sourceForFile(filename);
      currentComponent = Component;
      updateFileInputs(filename);

      const defaults = isPlainObject(module.DEFAULT_SETTINGS)
        ? module.DEFAULT_SETTINGS
        : {};
      currentDefaultSettings = deepClone(defaults);
      currentInitialSettings = applyOverrides(
        currentDefaultSettings,
        initialSettingsOverrides,
      );
      currentSettings = deepClone(currentInitialSettings);

      currentMountKey = `${filename}:${++renderVersion}`;
      renderCurrentComponent();
      updateShareUrl({ pushHistory });
      trackViewerEvent("page_view", {
        page_title: browserTitleForFile(currentFile),
      });
      trackViewerEvent("viewer_file_loaded");
    } catch (err) {
      const failedFileSource = FILE_SOURCES.has(filename)
        ? sourceForFile(filename)
        : "unknown";
      trackViewerEvent("viewer_file_load_failed", {
        file_name: filename,
        file_source: failedFileSource,
        error_name: err?.name || "Error",
      });
      console.error(err);
      root.render(
        React.createElement(
          "div",
          { className: "error-message" },
          `Error loading ${filename}:\n\n${err.message}\n\nCheck the browser console for more details.`,
        ),
      );
      syncPageBackgroundToComponent();
    }
  }

  // Event listeners
  if (selectEl) {
    selectEl.addEventListener("change", (e) => {
      syncSelectedSelectTitle();
      if (e.target.value) {
        loadJSX(e.target.value, { pushHistory: true });
      }
    });
  }

  window.addEventListener("resize", refreshSelectOptionLabels);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!currentComponent || !currentFile) return;
      currentInitialSettings = deepClone(currentDefaultSettings);
      currentSettings = deepClone(currentDefaultSettings);
      currentMountKey = `${currentFile}:${++renderVersion}`;
      renderCurrentComponent();
      updateShareUrl();
      trackViewerEvent("viewer_reset");
    });
  }

  setupClipboardCopy(copyLinkBtn, shareUrlEl, {
    onCopy: () => trackViewerEvent("viewer_share_copied"),
  });

  window.addEventListener("popstate", () => {
    historyReplaceScheduler.cancel();
    const { initialFile, initialOverrides } = getStateFromUrl(
      window.location.href,
    );
    loadJSX(initialFile, {
      initialSettingsOverrides: initialOverrides,
      pushHistory: false,
    });
  });

  setupPanelToggles({
    panelToggleBtn,
    minimizeBtn,
    isMobile,
    onOpenControls: () => trackViewerEvent("viewer_controls_opened"),
    onCloseControls: () => trackViewerEvent("viewer_controls_closed"),
  });

  setupUploadSection({
    onUploadPanelOpened: () => trackViewerEvent("viewer_upload_panel_opened"),
    onUploadSubmitted: (params) =>
      trackViewerEvent("viewer_upload_submitted", params),
    onUploadSucceeded: (params) =>
      trackViewerEvent("viewer_upload_succeeded", params),
    onUploadFailed: (params) =>
      trackViewerEvent("viewer_upload_failed", params),
  });

  // Initialize: fetch manifest, then load from URL param or first file
  try {
    await fetchManifest();
  } catch (err) {
    root.render(
      React.createElement(
        "div",
        { className: "error-message" },
        `Failed to load JSX manifest:\n\n${err.message}`,
      ),
    );
    return;
  }
  const { initialFile, initialOverrides } = getStateFromUrl(
    window.location.href,
  );

  updateFileInputs(initialFile);
  loadJSX(initialFile, {
    initialSettingsOverrides: initialOverrides,
    pushHistory: false,
  });
}
