/**
 * Safe HTML Fetcher Service
 * Fetches remote pages with SSRF redirect re-validation, 10s timeouts, and 2MB size restrictions.
 */

import { validateUrlSafety } from "./urlValidator.js";

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Fetch HTML page safely with redirect tracking and size limits
 * @param {string} initialUrl
 * @param {object} options
 */
export async function fetchHtmlSafe(initialUrl, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects || MAX_REDIRECTS;

  let currentUrl = initialUrl;
  const redirectChain = [];
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // 1. Re-validate URL safety at each hop (prevents SSRF via 301/302 redirects)
    const safetyCheck = await validateUrlSafety(currentUrl);
    if (!safetyCheck.valid) {
      return {
        ok: false,
        status: 403,
        error: `SSRF Security Block: ${safetyCheck.error}`,
        finalUrl: currentUrl,
        redirectChain,
        html: null,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "MetaMend-SEO-Audit-Bot/1.0 (+https://metamend.dev/bot)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual", // Manually handle redirects to validate each target
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      // Check for redirects (301, 302, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            ok: false,
            status: response.status,
            error: `Redirect without Location header on ${currentUrl}`,
            finalUrl: currentUrl,
            redirectChain,
            html: null,
          };
        }

        const nextUrl = new URL(location, currentUrl).toString();
        redirectChain.push({
          from: currentUrl,
          to: nextUrl,
          status: response.status,
        });

        redirectsCount++;
        currentUrl = nextUrl;
        continue;
      }

      // Check content-type (only read HTML)
      const contentType = response.headers.get("content-type") || "";
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          status: response.status,
          error: `Page size exceeds 2 MB limit (${contentLengthHeader} bytes)`,
          finalUrl: currentUrl,
          redirectChain,
          html: null,
        };
      }

      // Read text safely with size guard
      const rawText = await response.text();
      if (Buffer.byteLength(rawText, "utf-8") > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          status: response.status,
          error: "Response payload exceeded 2 MB limit.",
          finalUrl: currentUrl,
          redirectChain,
          html: null,
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        contentType,
        html: rawText,
        responseTimeMs,
        finalUrl: currentUrl,
        redirectChain,
        headers: {
          "x-robots-tag": response.headers.get("x-robots-tag") || "",
          "content-type": contentType,
          "cache-control": response.headers.get("cache-control") || "",
          server: response.headers.get("server") || "",
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      return {
        ok: false,
        status: isTimeout ? 408 : 0,
        error: isTimeout ? `Request timed out after ${timeoutMs}ms` : err.message,
        finalUrl: currentUrl,
        redirectChain,
        html: null,
      };
    }
  }

  return {
    ok: false,
    status: 310,
    error: `Exceeded maximum redirect limit of ${maxRedirects}`,
    finalUrl: currentUrl,
    redirectChain,
    html: null,
  };
}

