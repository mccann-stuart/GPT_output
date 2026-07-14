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

export function isSafeUploadFileName(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/.test(value)
  );
}
