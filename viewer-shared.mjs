import React from "react";
import { createRoot } from "react-dom/client";

function setupClipboardCopy(copyLinkBtn, shareUrlEl) {
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      const link = shareUrlEl?.value;
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        const originalText = copyLinkBtn.textContent;
        const spanEl = copyLinkBtn.querySelector("span");
        if (spanEl) {
          spanEl.textContent = "Copied!";
          setTimeout(() => {
            spanEl.textContent = "Copy Link";
          }, 2000);
        } else {
          copyLinkBtn.textContent = "Copied!";
          setTimeout(() => {
            copyLinkBtn.textContent = originalText;
          }, 2000);
        }
      } catch (err) {
        console.warn(
          "Clipboard API unavailable, falling back to text selection.",
          err,
        );
        if (shareUrlEl) {
          shareUrlEl.focus();
          shareUrlEl.select();
          document.execCommand("copy");
        }
      }
    });
  }
}

function setupUploadSection() {
  // Optional Upload Section (Desktop-only)
  const uploadToggleBtn = document.getElementById("upload-toggle-btn");
  const uploadSection = document.getElementById("upload-section");
  const uploadInput = document.getElementById("upload-input");
  const uploadDropzone = document.getElementById("upload-dropzone");
  const uploadFileList = document.getElementById("upload-file-list");
  const uploadErrorEl = document.getElementById("upload-error");
  const uploadStatusEl = document.getElementById("upload-status");
  const uploadSubmitBtn = document.getElementById("upload-submit-btn");
  const uploadClearBtn = document.getElementById("upload-clear-btn");
  const topBar = document.getElementById("top-bar");

  let selectedUploadFiles = [];

  function setUploadError(message) {
    if (!uploadErrorEl) return;
    uploadErrorEl.textContent = message || "";
    uploadErrorEl.classList.toggle("visible", Boolean(message));
  }

  function renderUploadFileList() {
    if (!uploadFileList) return;
    uploadFileList.textContent = "";
    selectedUploadFiles.forEach((file) => {
      const item = document.createElement("li");
      item.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
      uploadFileList.appendChild(item);
    });
  }

  function validateUploadFiles(files) {
    if (files.length === 0) {
      return "Select one .jsx file and optional .mjs files.";
    }
    const names = new Set();
    let jsxCount = 0;
    for (const file of files) {
      if (!isSafeUploadFileName(file.name)) {
        return `Unsupported or unsafe file name: ${file.name || "(unnamed file)"}`;
      }
      if (names.has(file.name)) {
        return `Duplicate file name: ${file.name}`;
      }
      names.add(file.name);
      if (file.name.endsWith(".jsx")) {
        jsxCount += 1;
      }
    }
    if (jsxCount !== 1) {
      return "Select exactly one .jsx file.";
    }
    return "";
  }

  function setSelectedUploadFiles(files) {
    selectedUploadFiles = Array.from(files || []);
    const validationError = validateUploadFiles(selectedUploadFiles);
    renderUploadFileList();
    setUploadError(validationError);
    if (uploadSubmitBtn) {
      uploadSubmitBtn.disabled = Boolean(validationError);
    }
    if (uploadStatusEl) {
      uploadStatusEl.textContent =
        selectedUploadFiles.length > 0
          ? `${selectedUploadFiles.length} file(s) ready.`
          : "No files selected.";
    }
  }

  function clearUploadFiles() {
    selectedUploadFiles = [];
    if (uploadInput) {
      uploadInput.value = "";
    }
    renderUploadFileList();
    setUploadError("");
    if (uploadSubmitBtn) {
      uploadSubmitBtn.disabled = true;
    }
    if (uploadStatusEl) {
      uploadStatusEl.textContent = "No files selected.";
    }
  }

  async function uploadSelectedDeliverable() {
    const validationError = validateUploadFiles(selectedUploadFiles);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const formData = new FormData();
    selectedUploadFiles.forEach((file) => {
      formData.append("files", file, file.name);
    });

    if (uploadSubmitBtn) {
      uploadSubmitBtn.disabled = true;
    }
    setUploadError("");
    if (uploadStatusEl) {
      uploadStatusEl.textContent = "Uploading files to Cloudflare R2...";
    }

    try {
      const response = await fetch("/api/upload-deliverable", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          body.error || `Upload failed with HTTP ${response.status}`,
        );
      }
      if (uploadStatusEl) {
        uploadStatusEl.textContent = `Stored ${body.jsxFile} in Cloudflare R2. Opening...`;
      }
      window.location.assign(body.openUrl);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
      if (uploadStatusEl) {
        uploadStatusEl.textContent = "Upload stopped.";
      }
      if (uploadSubmitBtn) {
        uploadSubmitBtn.disabled = false;
      }
    }
  }

  if (uploadToggleBtn && uploadSection && topBar) {
    uploadToggleBtn.addEventListener("click", () => {
      const willOpen = uploadSection.classList.contains("hidden");
      uploadSection.classList.toggle("hidden", !willOpen);
      topBar.classList.toggle("upload-open", willOpen);
    });
  }

  if (uploadDropzone) {
    uploadDropzone.addEventListener("click", () => uploadInput?.click());
    uploadDropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        uploadInput?.click();
      }
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      uploadDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDropzone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      uploadDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDropzone.classList.remove("drag-over");
      });
    });
    uploadDropzone.addEventListener("drop", (event) => {
      setSelectedUploadFiles(event.dataTransfer.files);
    });
  }

  if (uploadInput) {
    uploadInput.addEventListener("change", (event) => {
      setSelectedUploadFiles(event.target.files);
    });
  }

  if (uploadSubmitBtn) {
    uploadSubmitBtn.addEventListener("click", uploadSelectedDeliverable);
  }
  if (uploadClearBtn) {
    uploadClearBtn.addEventListener("click", clearUploadFiles);
  }
}

function isOpenControlsShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.code === "KeyD" || key === "d")
  );
}

function setupPanelToggles({ panelToggleBtn, minimizeBtn, isMobile }) {
  if (!isMobile) {
    const topBar = document.getElementById("top-bar");
    const openControls = () => {
      if (topBar) {
        topBar.classList.remove("hidden");
      }
    };

    if (topBar) {
      window.addEventListener("keydown", (event) => {
        if (!isOpenControlsShortcut(event)) return;
        event.preventDefault();
        openControls();
      });
    }

    if (minimizeBtn && topBar) {
      minimizeBtn.addEventListener("click", () => {
        topBar.classList.add("hidden");
      });
    }
  } else {
    const topNav = document.getElementById("top-nav");
    const bottomTab = document.getElementById("bottom-tab");
    const scrollContainer = document.getElementById("scroll-container");
    const openControls = () => {
      if (topNav && bottomTab && scrollContainer) {
        topNav.classList.remove("hidden");
        bottomTab.classList.remove("hidden");
        scrollContainer.classList.remove("expanded");
        panelToggleBtn?.classList.add("hidden");
      }
    };

    if (topNav && bottomTab && scrollContainer) {
      panelToggleBtn?.addEventListener("click", openControls);

      window.addEventListener("keydown", (event) => {
        if (!isOpenControlsShortcut(event)) return;
        event.preventDefault();
        openControls();
      });
    }

    if (minimizeBtn && topNav && bottomTab && scrollContainer) {
      minimizeBtn.addEventListener("click", () => {
        topNav.classList.add("hidden");
        bottomTab.classList.add("hidden");
        scrollContainer.classList.add("expanded");
        panelToggleBtn?.classList.remove("hidden");
      });
    }
  }
}

function registerGlobalErrorHandlers() {
  // Register global error handlers
  window.addEventListener("error", (e) => {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.textContent = "";
      const errDiv = document.createElement("div");
      errDiv.className = "error-message";
      errDiv.style.margin = "20px";
      errDiv.style.whiteSpace = "pre-wrap";
      errDiv.textContent = `Uncaught Error: ${e.message}\nCheck browser console for more details.`;
      rootEl.appendChild(errDiv);
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      const msg = e.reason && e.reason.message ? e.reason.message : e.reason;
      rootEl.textContent = "";
      const errDiv = document.createElement("div");
      errDiv.className = "error-message";
      errDiv.style.margin = "20px";
      errDiv.style.whiteSpace = "pre-wrap";
      errDiv.textContent = `Unhandled Promise Rejection: ${msg}\nCheck browser console for more details.`;
      rootEl.appendChild(errDiv);
    }
  });
}

const SHARE_PARAM = "state";
const MAX_SHARED_STATE_LENGTH = 12000;
export function isSafeObjectKey(key) {
  return key !== "__proto__" && key !== "prototype" && key !== "constructor";
}

export function isAllowedManifestFile(value) {
  return (
    typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*\.jsx$/.test(value)
  );
}

export function truncateMiddle(text, maxLength) {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  const keepLength = maxLength - 3;
  const prefixLength = Math.ceil(keepLength * 0.62);
  const suffixLength = keepLength - prefixLength;
  return `${text.slice(0, prefixLength)}...${text.slice(text.length - suffixLength)}`;
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (isPlainObject(value)) {
    const copy = {};
    Object.keys(value).forEach((key) => {
      if (!isSafeObjectKey(key)) return;
      copy[key] = deepClone(value[key]);
    });
    return copy;
  }
  return value;
}

export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a).filter(isSafeObjectKey);
    const bKeys = Object.keys(b).filter(isSafeObjectKey);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

export function applyOverrides(defaultValue, overrideValue) {
  if (overrideValue === undefined) {
    return deepClone(defaultValue);
  }
  if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
    const merged = {};
    const keys = new Set([
      ...Object.keys(defaultValue),
      ...Object.keys(overrideValue),
    ]);
    keys.forEach((key) => {
      if (!isSafeObjectKey(key)) return;
      merged[key] = applyOverrides(defaultValue[key], overrideValue[key]);
    });
    return merged;
  }
  return deepClone(overrideValue);
}

export function diffFromDefaults(currentValue, defaultValue) {
  if (deepEqual(currentValue, defaultValue)) return undefined;
  if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
    return deepClone(currentValue);
  }
  if (isPlainObject(currentValue) && isPlainObject(defaultValue)) {
    const delta = {};
    Object.keys(currentValue).forEach((key) => {
      if (!isSafeObjectKey(key)) return;
      const child = diffFromDefaults(currentValue[key], defaultValue[key]);
      if (child !== undefined) {
        delta[key] = child;
      }
    });
    return Object.keys(delta).length > 0 ? delta : undefined;
  }
  return deepClone(currentValue);
}

export function encodeBase64Url(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

export function parseSharedState(encoded) {
  if (!encoded) return null;
  if (encoded.length > MAX_SHARED_STATE_LENGTH) return null;
  try {
    const parsed = decodeBase64Url(encoded);
    if (!isPlainObject(parsed) || typeof parsed.file !== "string") return null;
    const overrides = isPlainObject(parsed.overrides) ? parsed.overrides : {};
    return { file: parsed.file, overrides };
  } catch (err) {
    console.warn("Invalid shared state in URL:", err);
    return null;
  }
}

export function isSafeUploadFileName(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/.test(value)
  );
}

export async function initViewer(options = {}) {
  const {
    isMobile = false,
    defaultPageBg = "#f4f4f9",
    selectLabelMinLength = 24,
    selectLabelMaxLength = 44,
    selectLabelHorizontalChrome = 38,
    selectLabelAverageCharRatio = 0.56,
  } = options;

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

  // Helper functions

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
    const res = await fetch("jsx-manifest.json");
    if (!res.ok) throw new Error("Failed to load jsx-manifest.json");
    const manifest = await res.json();
    if (!Array.isArray(manifest)) {
      throw new Error("JSX manifest must be an array");
    }
    FILE_SOURCES.clear();
    const staticFiles = manifest.filter(isAllowedManifestFile);
    staticFiles.forEach((file) => FILE_SOURCES.set(file, "static"));

    const uploadedFiles = await fetchUploadedManifest();
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
      window.history.pushState({}, "", url);
    } else {
      window.history.replaceState({}, "", url);
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

      // Transpile using Babel
      let transpiled = Babel.transform(jsxCode, {
        presets: [
          ["react", { runtime: "automatic" }], // Use new JSX transform
        ],
        filename: filename,
      }).code;

      // Fix relative imports for blob URL
      const fileUrl = new URL(sourceUrl, window.location.href).href;
      transpiled = transpiled.replace(
        /(import|export|from)\s+['"](\.[^'"]+)['"]/g,
        (match, p1, p2) => {
          const absUrl = new URL(p2, fileUrl).href;
          return `${p1} '${absUrl}'`;
        },
      );
      transpiled = transpiled.replace(
        /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
        (match, p1) => {
          const absUrl = new URL(p1, fileUrl).href;
          return `import('${absUrl}')`;
        },
      );

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
    } catch (err) {
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
    });
  }

  setupClipboardCopy(copyLinkBtn, shareUrlEl);

  window.addEventListener("popstate", () => {
    const { initialFile, initialOverrides } = getStateFromUrl(
      window.location.href,
    );
    loadJSX(initialFile, {
      initialSettingsOverrides: initialOverrides,
      pushHistory: false,
    });
  });

  setupPanelToggles({ panelToggleBtn, minimizeBtn, isMobile });

  setupUploadSection();

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
