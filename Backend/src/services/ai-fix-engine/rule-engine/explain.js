/**
 * Plain-Language Reason Generator for Rule Engine Fixes
 */

const REASONS = {
  title: {
    missing: "Search engines require a <title> tag on every page to index content and display informative search results.",
    truncated: "Titles longer than 60 characters are truncated in search engine result pages (SERPs).",
    short: "Titles under 30 characters miss critical keyword relevance and branding opportunities.",
  },
  metaDescription: {
    missing: "Without a meta description, search engines generate random snippet text from the page body.",
    truncated: "Descriptions exceeding 160 characters are cut off with ellipses in search snippets.",
    short: "Descriptions under 120 characters fail to entice searchers with sufficient context.",
  },
  canonical: {
    missing: "Canonical tags prevent duplicate content penalties across tracking URLs, protocols, and subdomains.",
  },
  viewport: {
    missing: "The mobile viewport meta tag enables responsive layouts and prevents mobile search ranking penalties.",
  },
  htmlLang: {
    missing: "The html lang attribute informs search crawlers and screen readers of the primary document language.",
  },
  charset: {
    missing: "Declaring UTF-8 character encoding prevents text rendering glitches and browser encoding misinterpretations.",
  },
  favicon: {
    missing: "Favicons enhance brand trust and visual recognition in browser tabs, bookmarks, and mobile search results.",
  },
  openGraph: {
    missing: "OpenGraph tags ensure links expand into rich visual preview cards when shared on messaging and social platforms.",
  },
  twitterCard: {
    missing: "Twitter card tags enable large image previews when your URLs are shared on X / Twitter.",
  },
  robots: {
    missing: "A robots.txt file guides search engine crawlers and protects private paths from indexing.",
    blocksAll: "The current robots.txt contains Disallow: / which prevents search engines from indexing your site.",
  },
  sitemap: {
    missing: "An XML sitemap helps search engines discover all published and nested routes quickly.",
  },
  jsonLd: {
    missing: "Structured data (JSON-LD) enables Google Rich Results, Knowledge Graph recognition, and enhanced search snippets.",
  },
};

/**
 * Returns plain-language description and reason for an applied rule change.
 * @param {string} ruleId
 * @param {string} subtype
 * @param {Object} [details]
 * @returns {{ description: string, reason: string }}
 */
export function explainChange(ruleId, subtype = "missing", details = {}) {
  const reason = REASONS[ruleId]?.[subtype] || REASONS[ruleId]?.missing || "Improves technical SEO compliance.";

  let description = `Updated ${ruleId} configuration.`;

  switch (ruleId) {
    case "title":
      description = details.value
        ? `Configured page title: "${details.value}".`
        : "Configured optimized page title tag.";
      break;
    case "metaDescription":
      description = details.value
        ? `Configured meta description: "${details.value.slice(0, 60)}...".`
        : "Configured meta description.";
      break;
    case "canonical":
      description = `Added canonical URL pointing to ${details.value || "authoritative URL"}.`;
      break;
    case "viewport":
      description = 'Added standard mobile viewport tag: width=device-width, initial-scale=1.';
      break;
    case "htmlLang":
      description = `Set <html lang="${details.value || "en"}"> on document root.`;
      break;
    case "charset":
      description = 'Declared character encoding <meta charset="utf-8">.';
      break;
    case "openGraph":
      description = "Configured OpenGraph tags (title, description, url, siteName, and preview image).";
      break;
    case "twitterCard":
      description = `Configured Twitter card (${details.cardType || "summary_large_image"}).`;
      break;
    case "robots":
      description = "Generated standard robots configuration allowing indexable routes.";
      break;
    case "sitemap":
      description = "Generated sitemap configuration linking to primary routes.";
      break;
    case "jsonLd":
      description = "Injected Organization & WebSite JSON-LD structured data.";
      break;
  }

  return { description, reason };
}

/**
 * Returns plain-language rationale for a rule ID.
 * @param {string} ruleId
 * @returns {string}
 */
export function getRuleReason(ruleId) {
  return REASONS[ruleId]?.missing || REASONS[ruleId]?.truncated || "Improves technical SEO compliance.";
}

