import * as cheerio from "cheerio";

/**
 * Parses HTML and checks existing SEO tags inside <head>.
 * @param {string} html
 * @returns {Object} Extracted tags and structure
 */
export function inspectHtml(html) {
  const $ = cheerio.load(html || "", { xml: false });
  const head = $("head");
  const htmlTag = $("html");

  return {
    lang: htmlTag.attr("lang") || null,
    charset: head.find("meta[charset]").attr("charset") || null,
    viewport: head.find('meta[name="viewport"]').attr("content") || null,
    title: head.find("title").first().text() || null,
    description: head.find('meta[name="description"]').attr("content") || null,
    canonical: head.find('link[rel="canonical"]').attr("href") || null,
    ogTitle: head.find('meta[property="og:title"]').attr("content") || null,
    ogDescription: head.find('meta[property="og:description"]').attr("content") || null,
    ogImage: head.find('meta[property="og:image"]').attr("content") || null,
    ogUrl: head.find('meta[property="og:url"]').attr("content") || null,
    ogType: head.find('meta[property="og:type"]').attr("content") || null,
    ogSiteName: head.find('meta[property="og:site_name"]').attr("content") || null,
    twitterCard: head.find('meta[name="twitter:card"]').attr("content") || null,
    twitterTitle: head.find('meta[name="twitter:title"]').attr("content") || null,
    twitterImage: head.find('meta[name="twitter:image"]').attr("content") || null,
    favicon: head.find('link[rel="icon"], link[rel="shortcut icon"]').attr("href") || null,
    hasJsonLd: head.find('script[type="application/ld+json"]').length > 0,
    hasHead: head.length > 0,
  };
}

/**
 * Detects indentation used inside <head> (e.g. 2 spaces or 4 spaces)
 * @param {string} html
 * @returns {string} Indentation string
 */
export function detectHeadIndentation(html) {
  const match = html.match(/<head[^>]*>\r?\n([ \t]+)/i);
  return match ? match[1] : "    ";
}

/**
 * Updates or sets the lang attribute on the <html> tag preserving formatting.
 * @param {string} html
 * @param {string} lang
 * @returns {string}
 */
export function setHtmlLang(html, lang) {
  if (/<html\s+[^>]*lang=["'][^"']*["']/i.test(html)) {
    return html.replace(/(<html\s+[^>]*lang=)["'][^"']*["']/i, `$1"${lang}"`);
  }
  if (/<html\s*>/i.test(html)) {
    return html.replace(/<html\s*>/i, `<html lang="${lang}">`);
  }
  if (/<html\s+/i.test(html)) {
    return html.replace(/(<html\s+)/i, `$1lang="${lang}" `);
  }
  return html;
}

/**
 * Sets or updates the <title> tag inside <head> preserving formatting.
 * @param {string} html
 * @param {string} newTitle
 * @param {string} indent
 * @returns {string}
 */
export function setHtmlTitle(html, newTitle, indent = "    ") {
  if (/<title>.*?<\/title>/is.test(html)) {
    return html.replace(/<title>.*?<\/title>/is, `<title>${newTitle}</title>`);
  }
  return insertIntoHead(html, `<title>${newTitle}</title>`, indent);
}

/**
 * Sets or updates the <meta name="description"> tag inside <head> preserving formatting.
 * @param {string} html
 * @param {string} newDesc
 * @param {string} indent
 * @returns {string}
 */
export function setHtmlDescription(html, newDesc, indent = "    ") {
  if (newDesc === null || newDesc === undefined) return html;
  const descRegex = /<meta\s+([^>]*name=["']description["'][^>]*)>/i;
  const match = html.match(descRegex);
  if (match) {
    const fullTag = match[0];
    let updatedTag = fullTag;
    if (/content=["'][^"']*["']/i.test(updatedTag)) {
      updatedTag = updatedTag.replace(/content=["'][^"']*["']/i, `content="${newDesc}"`);
    } else {
      updatedTag = updatedTag.replace(/(\s*\/?>)$/, ` content="${newDesc}"$1`);
    }
    return html.replace(fullTag, updatedTag);
  }
  return insertIntoHead(html, `<meta name="description" content="${newDesc}" />`, indent);
}

/**
 * Sets or updates the favicon <link rel="icon"> inside <head> preserving formatting.
 * @param {string} html
 * @param {string} faviconHref
 * @param {string} indent
 * @returns {string}
 */
export function setHtmlFavicon(html, faviconHref, indent = "    ") {
  if (!faviconHref) return html;
  const iconRegex = /<link\s+([^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*)>/i;
  const match = html.match(iconRegex);
  if (match) {
    const fullTag = match[0];
    let updatedTag = fullTag;
    if (/href=["'][^"']*["']/i.test(updatedTag)) {
      updatedTag = updatedTag.replace(/href=["'][^"']*["']/i, `href="${faviconHref}"`);
    } else {
      updatedTag = updatedTag.replace(/(\s*\/?>)$/, ` href="${faviconHref}"$1`);
    }
    return html.replace(fullTag, updatedTag);
  }
  return insertIntoHead(html, `<link rel="icon" href="${faviconHref}" />`, indent);
}

/**
 * Sets or updates the canonical link tag inside <head> preserving formatting.
 * @param {string} html
 * @param {string} canonicalHref
 * @param {string} indent
 * @returns {string}
 */
export function setHtmlCanonical(html, canonicalHref, indent = "    ") {
  if (!canonicalHref) return html;
  const canonRegex = /<link\s+([^>]*rel=["']canonical["'][^>]*)>/i;
  const match = html.match(canonRegex);
  if (match) {
    const fullTag = match[0];
    let updatedTag = fullTag;
    if (/href=["'][^"']*["']/i.test(updatedTag)) {
      updatedTag = updatedTag.replace(/href=["'][^"']*["']/i, `href="${canonicalHref}"`);
    } else {
      updatedTag = updatedTag.replace(/(\s*\/?>)$/, ` href="${canonicalHref}"$1`);
    }
    return html.replace(fullTag, updatedTag);
  }
  return insertIntoHead(html, `<link rel="canonical" href="${canonicalHref}" />`, indent);
}

/**
 * Sets or updates a generic meta tag by attribute (property or name) preserving formatting.
 * @param {string} html
 * @param {'property'|'name'} attrType
 * @param {string} attrName
 * @param {string} contentValue
 * @param {string} indent
 * @returns {string}
 */
export function setHtmlMetaTag(html, attrType, attrName, contentValue, indent = "    ") {
  if (contentValue === null || contentValue === undefined) return html;
  const regex = new RegExp(`<meta\\s+([^>]*${attrType}=["']${attrName}["'][^>]*)>`, "i");
  const match = html.match(regex);
  if (match) {
    const fullTag = match[0];
    let updatedTag = fullTag;
    if (/content=["'][^"']*["']/i.test(updatedTag)) {
      updatedTag = updatedTag.replace(/content=["'][^"']*["']/i, `content="${contentValue}"`);
    } else {
      updatedTag = updatedTag.replace(/(\s*\/?>)$/, ` content="${contentValue}"$1`);
    }
    return html.replace(fullTag, updatedTag);
  }
  return insertIntoHead(html, `<meta ${attrType}="${attrName}" content="${contentValue}" />`, indent);
}

/**
 * Inserts a tag or string into <head> right before </head> preserving indentation.
 * @param {string} html
 * @param {string} tagString
 * @param {string} indent
 * @returns {string}
 */
export function insertIntoHead(html, tagString, indent = "    ") {
  const closingHeadMatch = html.match(/([ \t]*)<\/head>/i);
  if (!closingHeadMatch) return html;

  const closingIndent = closingHeadMatch[1] || "";
  const insertion = `${indent}${tagString}\n${closingIndent}`;
  return html.replace(/([ \t]*)<\/head>/i, `${insertion}</head>`);
}
