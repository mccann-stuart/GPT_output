import { SHARE_PARAM } from "./viewer-state.mjs";

export const GA_MEASUREMENT_ID = "G-HFPWB2XVCM";
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

export function sendAnalyticsEvent(eventName, params = {}) {
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
