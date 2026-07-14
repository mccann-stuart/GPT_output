export const SHARE_PARAM = "state";
export const MAX_SHARED_STATE_LENGTH = 12000;

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
