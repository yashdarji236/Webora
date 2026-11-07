/**
 * XML Sitemap Inspection Service
 * Discovers, parses, and validates XML sitemaps and sitemap indexes.
 */

import { fetchHtmlSafe } from "./htmlFetcher.js";
import { isSameDomain } from "./urlNormalizer.js";

/**
 * Inspect and extract URLs from XML Sitemap
 * @param {string} baseOrigin
 * @param {string[]} declaredSitemaps
 */
export async function inspectSitemapXml(baseOrigin, declaredSitemaps = []) {
  const candidateUrls = [...declaredSitemaps];
  const defaultSitemap = new URL("/sitemap.xml", baseOrigin).toString();
  if (!candidateUrls.includes(defaultSitemap)) {
    candidateUrls.push(defaultSitemap);
  }

  for (const sitemapUrl of candidateUrls) {
    const fetchResult = await fetchHtmlSafe(sitemapUrl, { timeoutMs: 8000 });
    if (!fetchResult.ok || !fetchResult.html) continue;

    const xml = fetchResult.html.trim();

    // Check if valid XML structure
    const isUrlSet = xml.includes("<urlset") && xml.includes("<loc>");
    const isSitemapIndex = xml.includes("<sitemapindex") && xml.includes("<loc>");

    if (isUrlSet || isSitemapIndex) {
      // Extract <loc> tags
      const locMatches = [...xml.matchAll(/<loc[^>]*>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
      const domainUrls = locMatches.filter((u) => isSameDomain(u, baseOrigin));

      return {
        exists: true,
        url: sitemapUrl,
        status: fetchResult.status,
        isSitemapIndex,
        totalUrls: locMatches.length,
        domainUrlsCount: domainUrls.length,
        hasCrossDomainUrls: locMatches.length > domainUrls.length,
        urls: domainUrls.slice(0, 50), // Sample for audit checks
      };
    }
  }

  return {
    exists: false,
    url: defaultSitemap,
    status: 404,
    isSitemapIndex: false,
    totalUrls: 0,
    domainUrlsCount: 0,
    hasCrossDomainUrls: false,
    urls: [],
  };
}

