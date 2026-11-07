/**
 * Robots.txt Parser Service
 * Evaluates robots.txt availability, syntax validity, disallow rules, and sitemap references.
 */

import { fetchHtmlSafe } from "./htmlFetcher.js";

/**
 * Fetch and parse robots.txt for a given domain origin
 * @param {string} baseOrigin
 */
export async function inspectRobotsTxt(baseOrigin) {
  const robotsUrl = new URL("/robots.txt", baseOrigin).toString();

  const fetchResult = await fetchHtmlSafe(robotsUrl, { timeoutMs: 7000 });

  if (!fetchResult.ok || !fetchResult.html) {
    return {
      exists: false,
      url: robotsUrl,
      status: fetchResult.status || 404,
      sitemaps: [],
      disallowedPaths: [],
      isAllDisallowed: false,
      raw: "",
      error: fetchResult.error || "robots.txt not found",
    };
  }

  const raw = fetchResult.html;
  const lines = raw.split(/\r?\n/);
  const sitemaps = [];
  const disallowedPaths = [];
  let currentUserAgent = "";
  let isAllDisallowed = false;

  for (const line of lines) {
    const clean = line.split("#")[0].trim(); // Remove inline comments
    if (!clean) continue;

    const lower = clean.toLowerCase();

    if (lower.startsWith("user-agent:")) {
      currentUserAgent = clean.substring("user-agent:".length).trim();
    } else if (lower.startsWith("sitemap:")) {
      const sitemapUrl = clean.substring("sitemap:".length).trim();
      if (sitemapUrl) sitemaps.push(sitemapUrl);
    } else if (lower.startsWith("disallow:")) {
      const path = clean.substring("disallow:".length).trim();
      if (path) {
        disallowedPaths.push({ userAgent: currentUserAgent || "*", path });
        if ((currentUserAgent === "*" || !currentUserAgent) && (path === "/" || path === "/*")) {
          isAllDisallowed = true;
        }
      }
    }
  }

  return {
    exists: true,
    url: robotsUrl,
    status: fetchResult.status,
    sitemaps,
    disallowedPaths,
    isAllDisallowed,
    raw: raw.slice(0, 2000), // Cap length
  };
}

