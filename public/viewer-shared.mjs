import React from "react";
import { createRoot } from "react-dom/client";

export const GA_MEASUREMENT_ID = "G-HFPWB2XVCM";
const DEFAULT_BROWSER_TITLE = "JSX Viewer";
const FAVICON_LINK_ID = "viewer-dynamic-favicon";
const SHARE_PARAM = "state";
const MAX_SHARED_STATE_LENGTH = 12000;

function stemForFilename(filename) {
  if (typeof filename !== "string") return "";
  const basename = filename.split("/").pop() || filename;
  return basename.replace(/\.jsx$/i, "");
}

export function browserTitleForFile(filename) {
  return typeof filename === "string" && filename.trim()
    ? filename
    : DEFAULT_BROWSER_TITLE;
}

export function faviconInitialsForFile(filename) {
  const stem = stemForFilename(filename)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  const parts = stem.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : (parts[0] || "JS").slice(0, 2);
  return initials.toUpperCase();
}

export function faviconColorForFile(filename) {
  const title = browserTitleForFile(filename);
  let hash = 0;
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) % 360;
  }
  return `hsl(${hash}, 58%, 34%)`;
}

function faviconDataUrlForFile(filename) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return "";

  context.fillStyle = faviconColorForFile(filename);
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  const initials = faviconInitialsForFile(filename);
  const fontSize = initials.length > 1 ? 28 : 34;
  context.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initials, 32, 34);

  return canvas.toDataURL("image/png");
}

function updateBrowserMetadata(filename) {
  document.title = browserTitleForFile(filename);

  const faviconHref = faviconDataUrlForFile(filename);
  if (!faviconHref) return;

  let link = document.getElementById(FAVICON_LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = FAVICON_LINK_ID;
    document.head.appendChild(link);
  }
  link.rel = "icon";
  link.type = "image/png";
  link.sizes = "64x64";
  link.href = faviconHref;
}

function defaultAnalyticsBaseUrl() {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }
  return "https://viewer.local/";
}

function compactAnalyticsParams(params) {
  const compacted = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    compacted[key] = value;
  });
  return compacted;
}

export function viewerTypeForMobile(isMobile) {
  return isMobile ? "iphone" : "desktop";
}

export function sanitizedAnalyticsUrlParts(
  urlLike,
  baseUrl = defaultAnalyticsBaseUrl(),
) {
  const url = new URL(urlLike || baseUrl, baseUrl);
  url.searchParams.delete(SHARE_PARAM);
  const pagePath = `${url.pathname}${url.search}${url.hash}`;
  return {
    page_location: url.toString(),
    page_path: pagePath,
  };
}

export function analyticsParamsForViewer({
  urlLike,
  viewerType,
  fileName,
  fileSource,
  extraParams = {},
} = {}) {
  const routeParams = sanitizedAnalyticsUrlParts(urlLike);
  return compactAnalyticsParams({
    ...routeParams,
    route_path: routeParams.page_path,
    viewer_type: viewerType,
    file_name: fileName,
    file_source: fileSource,
    ...extraParams,
  });
}

function sendAnalyticsEvent(eventName, params = {}) {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    typeof eventName !== "string" ||
    eventName.length === 0
  ) {
    return;
  }

  try {
    window.gtag("event", eventName, {
      send_to: GA_MEASUREMENT_ID,
      ...params,
    });
  } catch (err) {
    console.warn("Analytics event failed:", err);
  }
}

function setupClipboardCopy(copyLinkBtn, shareUrlEl, { onCopy } = {}) {
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      const link = shareUrlEl?.value;
      if (!link) return;
      let copied = false;
      const originalText = copyLinkBtn.textContent;
      const spanEl = copyLinkBtn.querySelector("span");
      const showCopiedFeedback = () => {
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
      };

      try {
        await navigator.clipboard.writeText(link);
        copied = true;
        showCopiedFeedback();
      } catch (err) {
        console.warn(
          "Clipboard API unavailable, falling back to text selection.",
          err,
        );
        if (shareUrlEl) {
          shareUrlEl.focus();
          shareUrlEl.select();
          copied = document.execCommand("copy");
          if (copied) {
            showCopiedFeedback();
          }
        }
      }
      if (copied) {
        onCopy?.();
      }
    });
  }
}

function summarizeUploadFiles(files) {
  const fileList = Array.from(files || []);
  return {
    upload_file_count: fileList.length,
    upload_jsx_count: fileList.filter((file) => file.name.endsWith(".jsx"))
      .length,
    upload_mjs_count: fileList.filter((file) => file.name.endsWith(".mjs"))
      .length,
  };
}

function setupUploadSection({
  onUploadPanelOpened,
  onUploadSubmitted,
  onUploadSucceeded,
  onUploadFailed,
} = {}) {
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
      onUploadFailed?.({
        ...summarizeUploadFiles(selectedUploadFiles),
        upload_failure_type: "validation",
      });
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
    onUploadSubmitted?.(summarizeUploadFiles(selectedUploadFiles));

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
      onUploadSucceeded?.(summarizeUploadFiles(selectedUploadFiles));
      window.location.assign(body.openUrl);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
      if (uploadStatusEl) {
        uploadStatusEl.textContent = "Upload stopped.";
      }
      if (uploadSubmitBtn) {
        uploadSubmitBtn.disabled = false;
      }
      onUploadFailed?.({
        ...summarizeUploadFiles(selectedUploadFiles),
        upload_failure_type: "request",
      });
    }
  }

  if (uploadToggleBtn && uploadSection && topBar) {
    uploadToggleBtn.addEventListener("click", () => {
      const willOpen = uploadSection.classList.contains("hidden");
      uploadSection.classList.toggle("hidden", !willOpen);
      topBar.classList.toggle("upload-open", willOpen);
      if (willOpen) {
        onUploadPanelOpened?.();
      }
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
  const isDKey = event.code === "KeyD" || key === "d" || key === "∂";
  const isOptionD =
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey;
  const isSafariControlD =
    isSafariBrowser() &&
    event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey;

  return isDKey && (isOptionD || isSafariControlD);
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  return (
    /\bSafari\//.test(navigator.userAgent) &&
    !/\b(?:Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(
      navigator.userAgent,
    )
  );
}

function isEditableShortcutTarget(target) {
  if (!(target instanceof Element)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function addOpenControlsShortcut(openControls) {
  window.addEventListener(
    "keydown",
    (event) => {
      if (isEditableShortcutTarget(event.target)) return;
      if (!isOpenControlsShortcut(event)) return;
      event.preventDefault();
      openControls();
    },
    { capture: true },
  );
}

function setupPanelToggles({
  panelToggleBtn,
  minimizeBtn,
  isMobile,
  onOpenControls,
  onCloseControls,
}) {
  if (!isMobile) {
    const topBar = document.getElementById("top-bar");
    const openControls = () => {
      if (topBar) {
        const wasHidden = topBar.classList.contains("hidden");
        topBar.classList.remove("hidden");
        if (wasHidden) {
          onOpenControls?.();
        }
      }
    };

    if (topBar) {
      addOpenControlsShortcut(openControls);
    }

    if (minimizeBtn && topBar) {
      minimizeBtn.addEventListener("click", () => {
        const wasVisible = !topBar.classList.contains("hidden");
        topBar.classList.add("hidden");
        if (wasVisible) {
          onCloseControls?.();
        }
      });
    }
  } else {
    const topNav = document.getElementById("top-nav");
    const bottomTab = document.getElementById("bottom-tab");
    const scrollContainer = document.getElementById("scroll-container");
    const openControls = () => {
      if (topNav && bottomTab && scrollContainer) {
        const wasHidden = topNav.classList.contains("hidden");
        topNav.classList.remove("hidden");
        bottomTab.classList.remove("hidden");
        scrollContainer.classList.remove("expanded");
        panelToggleBtn?.classList.add("hidden");
        if (wasHidden) {
          onOpenControls?.();
        }
      }
    };

    const addShakeToOpenControls = (openFn) => {
      let lastX = null, lastY = null, lastZ = null;
      let lastUpdate = 0;
      const SHAKE_THRESHOLD = 15; // total change in acceleration in m/s^2 over 100ms
      const SHAKE_TIMEOUT = 1000;
      let shakeCount = 0;
      let lastShakeTime = 0;

      const onDeviceMotion = (event) => {
        const current = Date.now();
        if (current - lastUpdate < 100) return;

        const acc = event.acceleration || event.accelerationIncludingGravity;
        if (!acc) return;

        const x = acc.x;
        const y = acc.y;
        const z = acc.z;

        if (x === null || y === null || z === null) return;

        if (lastX !== null) {
          const deltaX = Math.abs(x - lastX);
          const deltaY = Math.abs(y - lastY);
          const deltaZ = Math.abs(z - lastZ);
          const change = deltaX + deltaY + deltaZ;

          if (change > SHAKE_THRESHOLD) {
            const timeDiff = current - lastShakeTime;
            if (timeDiff > 200 && timeDiff < SHAKE_TIMEOUT) {
              shakeCount++;
              if (shakeCount >= 2) {
                openFn();
                shakeCount = 0;
              }
            } else if (timeDiff >= SHAKE_TIMEOUT || lastShakeTime === 0) {
              shakeCount = 1;
            }
            lastShakeTime = current;
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
        lastUpdate = current;
      };

      const startListening = () => {
        window.addEventListener("devicemotion", onDeviceMotion, true);
      };

      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        const requestPermission = () => {
          DeviceMotionEvent.requestPermission()
            .then((state) => {
              if (state === "granted") {
                startListening();
              }
            })
            .catch((err) => {
              console.error("Error requesting DeviceMotion permission:", err);
            });
          window.removeEventListener("click", requestPermission);
          window.removeEventListener("touchstart", requestPermission);
        };

        window.addEventListener("click", requestPermission);
        window.addEventListener("touchstart", requestPermission);
      } else {
        startListening();
      }
    };

    if (topNav && bottomTab && scrollContainer) {
      panelToggleBtn?.addEventListener("click", openControls);
      addOpenControlsShortcut(openControls);
      addShakeToOpenControls(openControls);
    }

    if (minimizeBtn && topNav && bottomTab && scrollContainer) {
      minimizeBtn.addEventListener("click", () => {
        const wasVisible = !topNav.classList.contains("hidden");
        topNav.classList.add("hidden");
        bottomTab.classList.add("hidden");
        scrollContainer.classList.add("expanded");
        // Keep panelToggleBtn hidden (do not remove "hidden" class)
        if (wasVisible) {
          onCloseControls?.();
        }
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
