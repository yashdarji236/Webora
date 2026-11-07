/**
 * HTML Parser Service
 * Parses HTML documents with Cheerio to extract metadata, headings, images, links, and JSON-LD.
 */

import * as cheerio from "cheerio";

/**
 * Parse an HTML document and extract complete SEO indicators
 * @param {string} html
 * @param {string} pageUrl
 */
export function parseHtml(html, pageUrl) {
  if (!html || typeof html !== "string") {
    return null;
  }

  const $ = cheerio.load(html);

  // 1. Basic Metadata
  const title = $("title").first().text().trim() || "";
  const metaDescription =
    $('meta[name="description" i]').attr("content")?.trim() ||
    $('meta[property="description" i]').attr("content")?.trim() ||
    "";
  const canonical = $('link[rel="canonical" i]').attr("href")?.trim() || "";
  const metaRobots =
    $('meta[name="robots" i]').attr("content")?.trim().toLowerCase() ||
    $('meta[name="googlebot" i]').attr("content")?.trim().toLowerCase() ||
    "";
  const viewport = $('meta[name="viewport" i]').attr("content")?.trim() || "";
  const charset =
    $("meta[charset]").attr("charset") ||
    $('meta[http-equiv="Content-Type" i]').attr("content") ||
    "";
  const htmlLang = $("html").attr("lang")?.trim() || "";
  const favicon =
    $('link[rel="icon" i]').attr("href") ||
    $('link[rel="shortcut icon" i]').attr("href") ||
    $('link[rel="apple-touch-icon" i]').attr("href") ||
    "";

  // 2. OpenGraph Metadata
  const openGraph = {
    title: $('meta[property="og:title" i]').attr("content")?.trim() || "",
    description: $('meta[property="og:description" i]').attr("content")?.trim() || "",
    image: $('meta[property="og:image" i]').attr("content")?.trim() || "",
    url: $('meta[property="og:url" i]').attr("content")?.trim() || "",
    type: $('meta[property="og:type" i]').attr("content")?.trim() || "",
    siteName: $('meta[property="og:site_name" i]').attr("content")?.trim() || "",
  };

  // 3. Twitter Card Metadata
  const twitter = {
    card: $('meta[name="twitter:card" i]').attr("content")?.trim() || "",
    title: $('meta[name="twitter:title" i]').attr("content")?.trim() || "",
    description: $('meta[name="twitter:description" i]').attr("content")?.trim() || "",
    image: $('meta[name="twitter:image" i]').attr("content")?.trim() || "",
    site: $('meta[name="twitter:site" i]').attr("content")?.trim() || "",
  };

  // 4. Heading Structure
  const headings = {
    h1: [],
    h2: [],
    h3: [],
  };

  $("h1").each((_, el) => {
    headings.h1.push($(el).text().trim());
  });
  $("h2").each((_, el) => {
    headings.h2.push($(el).text().trim());
  });
  $("h3").each((_, el) => {
    headings.h3.push($(el).text().trim());
  });

  // 5. Images
  const images = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const alt = $(el).attr("alt");
    const width = $(el).attr("width") || "";
    const height = $(el).attr("height") || "";

    images.push({
      src: src.trim(),
      alt: typeof alt === "string" ? alt.trim() : null, // null means missing alt attribute
      hasAlt: typeof alt === "string",
      isDecorative: alt === "",
      width,
      height,
    });
  });

  // 6. Links
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const text = $(el).text().trim();
    const rel = $(el).attr("rel")?.toLowerCase() || "";
    const target = $(el).attr("target") || "";

    if (href) {
      links.push({
        href,
        text,
        rel,
        target,
        isNoFollow: rel.includes("nofollow"),
      });
    }
  });

  // 7. Structured Data (JSON-LD)
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const rawContent = $(el).html()?.trim();
    if (rawContent) {
      try {
        const parsed = JSON.parse(rawContent);
        jsonLd.push({
          raw: rawContent,
          parsed,
          type: parsed["@type"] || (Array.isArray(parsed) ? parsed[0]?.["@type"] : "Unknown"),
          valid: true,
        });
      } catch (err) {
        jsonLd.push({
          raw: rawContent,
          parsed: null,
          valid: false,
          error: err.message,
        });
      }
    }
  });

  // 8. Content Word Count
  // Remove script and style elements before computing body text
  $("script, style, noscript, svg, nav, footer").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const words = bodyText.length > 0 ? bodyText.split(" ").filter(Boolean) : [];

  return {
    url: pageUrl,
    title,
    titleLength: title.length,
    metaDescription,
    descriptionLength: metaDescription.length,
    canonical,
    metaRobots,
    hasNoIndex: metaRobots.includes("noindex"),
    hasNoFollow: metaRobots.includes("nofollow"),
    viewport,
    charset,
    htmlLang,
    favicon,
    openGraph,
    twitter,
    headings: {
      h1: headings.h1,
      h2: headings.h2,
      h3: headings.h3,
      h1Count: headings.h1.length,
      h2Count: headings.h2.length,
      h3Count: headings.h3.length,
    },
    images: {
      total: images.length,
      missingAlt: images.filter((img) => !img.hasAlt).length,
      decorative: images.filter((img) => img.isDecorative).length,
      items: images.slice(0, 30), // Keep representative sample
    },
    links: {
      total: links.length,
      items: links,
    },
    structuredData: {
      hasJsonLd: jsonLd.length > 0,
      items: jsonLd,
    },
    content: {
      wordCount: words.length,
      characterCount: bodyText.length,
      isThinContent: words.length < 200,
    },
  };
}

