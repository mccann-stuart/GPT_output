import { isSafeUploadFileName } from "./viewer-utils.mjs";

export function setupClipboardCopy(copyLinkBtn, shareUrlEl, { onCopy } = {}) {
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

export function summarizeUploadFiles(files) {
  const fileList = Array.from(files || []);
  return {
    upload_file_count: fileList.length,
    upload_jsx_count: fileList.filter((file) => file.name.endsWith(".jsx"))
      .length,
    upload_mjs_count: fileList.filter((file) => file.name.endsWith(".mjs"))
      .length,
  };
}

export function setupUploadSection({
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

export function isOpenControlsShortcut(event) {
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

export function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  return (
    /\bSafari\//.test(navigator.userAgent) &&
    !/\b(?:Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(
      navigator.userAgent,
    )
  );
}

export function isEditableShortcutTarget(target) {
  if (!(target instanceof Element)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function addOpenControlsShortcut(openControls) {
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

export function addDeviceMotionPermissionTapHandler({
  target = typeof window !== "undefined" ? window : undefined,
  motionEvent =
    typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : undefined,
  startListening,
  onError = (err) => {
    console.error("Error requesting DeviceMotion permission:", err);
  },
} = {}) {
  if (typeof startListening !== "function") return () => {};

  if (
    !motionEvent ||
    typeof motionEvent.requestPermission !== "function"
  ) {
    startListening();
    return () => {};
  }

  if (!target || typeof target.addEventListener !== "function") {
    return () => {};
  }

  let hasRequested = false;
  const requestPermission = () => {
    if (hasRequested) return;
    hasRequested = true;

    let permissionRequest;
    try {
      permissionRequest = motionEvent.requestPermission();
    } catch (err) {
      cleanup();
      onError(err);
      return;
    }

    Promise.resolve(permissionRequest)
      .then((state) => {
        if (state === "granted") {
          startListening();
        }
      })
      .catch((err) => {
        onError(err);
      })
      .finally(cleanup);
  };

  const cleanup = () => {
    target.removeEventListener?.("click", requestPermission, true);
  };

  target.addEventListener("click", requestPermission, {
    capture: true,
    once: true,
  });

  return cleanup;
}

function addShakeToOpenControls(openFn) {
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

  addDeviceMotionPermissionTapHandler({ startListening });
}

function setupMobilePanelToggles({
  panelToggleBtn,
  minimizeBtn,
  onOpenControls,
  onCloseControls,
}) {
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

function setupDesktopPanelToggles({
  minimizeBtn,
  onOpenControls,
  onCloseControls,
}) {
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
}

export function setupPanelToggles({
  panelToggleBtn,
  minimizeBtn,
  isMobile,
  onOpenControls,
  onCloseControls,
}) {
  if (!isMobile) {
    setupDesktopPanelToggles({
      minimizeBtn,
      onOpenControls,
      onCloseControls,
    });
  } else {
    setupMobilePanelToggles({
      panelToggleBtn,
      minimizeBtn,
      onOpenControls,
      onCloseControls,
    });
  }
}

export function registerGlobalErrorHandlers() {
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
