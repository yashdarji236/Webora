/**
 * URL Normalizer Service
 * Standardizes URLs, strips tracking query parameters, resolves relative links,
 * and identifies internal vs external navigation.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "zanpid",
  "msclkid",
  "mc_eid",
  "ref",
  "ref_src",
  "_hsenc",
  "_hsmi",
]);

/**
 * Normalize an absolute URL string
 * @param {string} urlString
 * @returns {string}
 */
export function normalizeUrl(urlString) {
  if (!urlString) return "";
  try {
    const url = new URL(urlString);

    // Remove hash
    url.hash = "";

    // Remove tracking query params
    const keysToDelete = [];
    for (const key of url.searchParams.keys()) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => url.searchParams.delete(k));

    // Sort remaining query params for canonical consistency
    url.searchParams.sort();

    // Standardize path: remove redundant slashes
    let pathname = url.pathname.replace(/\/+/g, "/");
    // Standardize trailing slash: keep on root, remove on pages unless file
    if (pathname.length > 1 && pathname.endsWith("/") && !pathname.includes(".")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    return url.toString();
  } catch {
    return urlString.trim();
  }
}

/**
 * Resolve relative or protocol-relative link against base URL
 * @param {string} href
 * @param {string} baseUrl
 * @returns {string|null}
 */
export function resolveUrl(href, baseUrl) {
  if (!href || typeof href !== "string") return null;

  const trimmed = href.trim();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("#")
  ) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return normalizeUrl(resolved.toString());
  } catch {
    return null;
  }
}

/**
 * Check if candidate URL belongs to the target domain
 * @param {string} candidateUrl
 * @param {string} baseOrigin
 * @returns {boolean}
 */
export function isSameDomain(candidateUrl, baseOrigin) {
  try {
    const candidate = new URL(candidateUrl);
    const base = new URL(baseOrigin);
    return candidate.hostname === base.hostname;
  } catch {
    return false;
  }
}

