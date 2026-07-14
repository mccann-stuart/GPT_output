export const SHARE_PARAM = "state";
export const MAX_SHARED_STATE_LENGTH = 12000;
// WebKit limits History API writes to 100 per 10 seconds. Coalesce rapid
// component updates while leaving headroom for explicit user navigation.
export const HISTORY_REPLACE_MIN_INTERVAL_MS = 125;

export function createHistoryReplaceScheduler(
  historyLike,
  {
    now = () => Date.now(),
    setTimer = (callback, delay) => setTimeout(callback, delay),
    clearTimer = (timerId) => clearTimeout(timerId),
  } = {},
) {
  let lastWriteAt = Number.NEGATIVE_INFINITY;
  let pendingUrl = null;
  let timerId = null;

  function flush() {
    timerId = null;
    if (pendingUrl === null) return;

    const url = pendingUrl;
    pendingUrl = null;
    historyLike.replaceState({}, "", url);
    lastWriteAt = now();
  }

  function schedule(url) {
    pendingUrl = url;
    const delay = Math.max(
      0,
      HISTORY_REPLACE_MIN_INTERVAL_MS - (now() - lastWriteAt),
    );

    if (delay === 0) {
      flush();
    } else if (timerId === null) {
      timerId = setTimer(flush, delay);
    }
  }

  function cancel() {
    if (timerId !== null) clearTimer(timerId);
    timerId = null;
    pendingUrl = null;
  }

  return { schedule, cancel };
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

import { isPlainObject } from "./viewer-utils.mjs";

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
