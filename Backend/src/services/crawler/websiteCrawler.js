/**
 * Live Website Crawler Service
 * Crawls deployed website pages up to configurable depth and concurrency limits.
 */

import { fetchHtmlSafe } from "./htmlFetcher.js";
import { parseHtml } from "./htmlParser.js";
import { normalizeUrl, resolveUrl, isSameDomain } from "./urlNormalizer.js";
import { inspectRobotsTxt } from "./robotsParser.js";
import { inspectSitemapXml } from "./sitemapCrawler.js";

const DEFAULT_CONFIG = {
  maxPages: 25,
  maxDepth: 3,
  concurrency: 3,
  timeoutMs: 10000,
};

/**
 * Execute live website crawl
 * @param {string} startUrl
 * @param {object} customConfig
 * @param {function} onProgress
 */
export async function crawlWebsite(startUrl, customConfig = {}, onProgress = null) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const startTime = Date.now();

  const normalizedStart = normalizeUrl(startUrl);
  const startOrigin = new URL(normalizedStart).origin;

  // 1. Fetch robots.txt & XML sitemap in parallel
  if (onProgress) onProgress({ step: 1, message: "Inspecting robots.txt and sitemap" });
  const [robots, sitemap] = await Promise.all([
    inspectRobotsTxt(startOrigin),
    inspectSitemapXml(startOrigin),
  ]);

  const visitedUrls = new Set();
  const queue = [{ url: normalizedStart, depth: 0 }];
  const crawledPages = [];
  const brokenLinks = [];
  const redirects = [];
  let pagesFailed = 0;

  // Helper: check if path is disallowed by robots.txt
  const isPathDisallowed = (urlStr) => {
    if (!robots.exists) return false;
    try {
      const parsedPath = new URL(urlStr).pathname;
      return robots.disallowedPaths.some((rule) => {
        if (rule.userAgent === "*" || rule.userAgent.toLowerCase().includes("bot")) {
          return parsedPath.startsWith(rule.path);
        }
        return false;
      });
    } catch {
      return false;
    }
  };

  while (queue.length > 0 && crawledPages.length < config.maxPages) {
    // Process in batches up to configured concurrency
    const batch = queue.splice(0, config.concurrency);

    const promises = batch.map(async ({ url, depth }) => {
      if (visitedUrls.has(url)) return;
      visitedUrls.add(url);

      if (isPathDisallowed(url)) {
        return; // Respect robots.txt disallow rule
      }

      if (onProgress) {
        onProgress({
          step: 4,
          message: `Crawling page ${crawledPages.length + 1}: ${new URL(url).pathname || "/"}`,
          currentUrl: url,
        });
      }

      const fetchResult = await fetchHtmlSafe(url, { timeoutMs: config.timeoutMs });

      if (fetchResult.redirectChain && fetchResult.redirectChain.length > 0) {
        redirects.push(...fetchResult.redirectChain);
      }

      if (!fetchResult.ok || !fetchResult.html) {
        pagesFailed++;
        brokenLinks.push({
          sourceUrl: url,
          targetUrl: fetchResult.finalUrl || url,
          status: fetchResult.status,
          error: fetchResult.error || `HTTP ${fetchResult.status}`,
        });
        return;
      }

      const parsed = parseHtml(fetchResult.html, fetchResult.finalUrl);
      if (!parsed) return;

      crawledPages.push({
        ...parsed,
        status: fetchResult.status,
        responseTimeMs: fetchResult.responseTimeMs,
        redirectChain: fetchResult.redirectChain,
        depth,
      });

      // Discover internal links if maxDepth is not exceeded
      if (depth < config.maxDepth && crawledPages.length + queue.length < config.maxPages * 2) {
        for (const link of parsed.links.items) {
          const resolved = resolveUrl(link.href, fetchResult.finalUrl);
          if (
            resolved &&
            isSameDomain(resolved, startOrigin) &&
            !visitedUrls.has(resolved) &&
            !queue.some((item) => item.url === resolved)
          ) {
            // Filter out non-html extensions
            const lowerPath = new URL(resolved).pathname.toLowerCase();
            const isAsset = /\.(jpg|jpeg|png|gif|svg|pdf|css|js|webp|avif|ico|woff|woff2)$/i.test(lowerPath);
            if (!isAsset) {
              queue.push({ url: resolved, depth: depth + 1 });
            }
          }
        }
      }
    });

    await Promise.all(promises);
  }

  const durationMs = Date.now() - startTime;

  return {
    startUrl: normalizedStart,
    origin: startOrigin,
    pages: crawledPages,
    brokenLinks,
    redirects,
    robots,
    sitemap,
    pagesScanned: crawledPages.length,
    pagesFailed,
    durationMs,
    visitedCount: visitedUrls.size,
  };
}

