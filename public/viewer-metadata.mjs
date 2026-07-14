export const DEFAULT_BROWSER_TITLE = "JSX Viewer";
export const FAVICON_LINK_ID = "viewer-dynamic-favicon";
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

export function updateBrowserMetadata(filename) {
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
