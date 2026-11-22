import {
  inspectHtml,
  detectHeadIndentation,
  setHtmlLang,
  setHtmlTitle,
  setHtmlDescription,
  setHtmlFavicon,
  setHtmlCanonical,
  setHtmlMetaTag,
  insertIntoHead,
} from "../parsers/htmlParser.js";

/**
 * Patches React + Vite index.html file cleanly without reformatting entire document.
 *
 * @param {Object} ctx - RuleContext
 * @param {string} workingContent
 * @param {Object} tagDefinitions - Title, meta tags, link tags to inject
 * @returns {{ status: 'applied'|'noop'|'manual', patchedContent: string|null, manualSnippet: string|null, changes: Array, placeholders: Array, confidence: 'high'|'medium'|'low' }}
 */
export function patchReactViteHtml(ctx, workingContent, tagDefinitions = {}) {
  let content = workingContent;
  if (!content || !content.trim()) {
    content = `<!DOCTYPE html>
<html lang="${tagDefinitions.lang || "en"}">
  <head>
    <meta charset="${tagDefinitions.charset || "UTF-8"}" />
    <meta name="viewport" content="${tagDefinitions.viewport || "width=device-width, initial-scale=1.0"}" />
    <title>${tagDefinitions.title || "App"}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
  const changes = [];
  const placeholders = [];
  const existing = inspectHtml(content);
  const indent = detectHeadIndentation(content);

  // 1. html lang attribute
  if (tagDefinitions.lang && (!existing.lang || tagDefinitions.forceLangUpdate)) {
    if (existing.lang !== tagDefinitions.lang) {
      content = setHtmlLang(content, tagDefinitions.lang);
      changes.push({
        description: `Added lang="${tagDefinitions.lang}" to <html> tag.`,
        reason: "Declares primary document language for crawlers and assistive technologies.",
      });
    }
  }

  // 2. charset
  if (tagDefinitions.charset && !existing.charset) {
    content = insertIntoHead(content, `<meta charset="${tagDefinitions.charset}" />`, indent);
    changes.push({
      description: `Added <meta charset="${tagDefinitions.charset}" />.`,
      reason: "Declares standard UTF-8 encoding.",
    });
  }

  // 3. viewport
  if (tagDefinitions.viewport && !existing.viewport) {
    content = insertIntoHead(
      content,
      `<meta name="viewport" content="${tagDefinitions.viewport}" />`,
      indent
    );
    changes.push({
      description: `Added mobile viewport meta tag.`,
      reason: "Ensures responsive rendering on mobile devices.",
    });
  }

  // 4. title
  if (tagDefinitions.title && (existing.title !== tagDefinitions.title)) {
    content = setHtmlTitle(content, tagDefinitions.title, indent);
    if (tagDefinitions.title.startsWith("TODO:")) {
      placeholders.push(tagDefinitions.title);
    }
    changes.push({
      description: existing.title
        ? `Updated page <title>: "${tagDefinitions.title}".`
        : `Configured page <title>: "${tagDefinitions.title}".`,
      reason: "Sets authoritative document title in HTML head.",
    });
  }

  // 5. description
  if (tagDefinitions.description && (existing.description !== tagDefinitions.description)) {
    content = setHtmlDescription(content, tagDefinitions.description, indent);
    if (tagDefinitions.description.startsWith("TODO:")) {
      placeholders.push(tagDefinitions.description);
    }
    changes.push({
      description: existing.description
        ? `Updated meta description: "${tagDefinitions.description}".`
        : `Added <meta name="description"> tag.`,
      reason: "Provides descriptive snippet for search engine listings.",
    });
  }

  // 6. favicon
  if (tagDefinitions.favicon && (existing.favicon !== tagDefinitions.favicon)) {
    content = setHtmlFavicon(content, tagDefinitions.favicon, indent);
    changes.push({
      description: existing.favicon
        ? `Updated favicon link to "${tagDefinitions.favicon}".`
        : `Added favicon link ("${tagDefinitions.favicon}").`,
      reason: "Configures website icon in browser tabs and search engine results.",
    });
  }

  // 7. canonical
  if (tagDefinitions.canonical && (existing.canonical !== tagDefinitions.canonical)) {
    content = setHtmlCanonical(content, tagDefinitions.canonical, indent);
    changes.push({
      description: `Added <link rel="canonical" href="${tagDefinitions.canonical}" />.`,
      reason: "Declares authoritative self-referencing canonical URL.",
    });
  }

  // 8. OpenGraph tags
  if (tagDefinitions.openGraph) {
    const og = tagDefinitions.openGraph;
    if (og.title && existing.ogTitle !== og.title) {
      content = setHtmlMetaTag(content, "property", "og:title", og.title, indent);
      changes.push({ description: `Configured og:title to "${og.title}".`, reason: "OpenGraph title for social previews." });
    }
    if (og.description && existing.ogDescription !== og.description) {
      content = setHtmlMetaTag(content, "property", "og:description", og.description, indent);
      changes.push({ description: "Configured og:description meta tag.", reason: "OpenGraph description for social previews." });
    }
    if (og.url && existing.ogUrl !== og.url) {
      content = setHtmlMetaTag(content, "property", "og:url", og.url, indent);
      changes.push({ description: `Configured og:url to "${og.url}".`, reason: "OpenGraph URL." });
    }
    if (og.siteName && existing.ogSiteName !== og.siteName) {
      content = setHtmlMetaTag(content, "property", "og:site_name", og.siteName, indent);
      changes.push({ description: `Configured og:site_name to "${og.siteName}".`, reason: "OpenGraph site name." });
    }
    if (og.image && existing.ogImage !== og.image) {
      content = setHtmlMetaTag(content, "property", "og:image", og.image, indent);
      changes.push({ description: `Configured og:image to "${og.image}".`, reason: "OpenGraph preview image." });
    }
  }

  // 9. Twitter Card tags
  if (tagDefinitions.twitter) {
    const tw = tagDefinitions.twitter;
    if (tw.card && existing.twitterCard !== tw.card) {
      content = setHtmlMetaTag(content, "name", "twitter:card", tw.card, indent);
      changes.push({ description: `Configured twitter:card (${tw.card}).`, reason: "X/Twitter card format." });
    }
    if (tw.title && existing.twitterTitle !== tw.title) {
      content = setHtmlMetaTag(content, "name", "twitter:title", tw.title, indent);
      changes.push({ description: `Configured twitter:title to "${tw.title}".`, reason: "X/Twitter card title." });
    }
    if (tw.description) {
      content = setHtmlMetaTag(content, "name", "twitter:description", tw.description, indent);
      changes.push({ description: "Configured twitter:description meta tag.", reason: "X/Twitter card description." });
    }
    if (tw.image && existing.twitterImage !== tw.image) {
      content = setHtmlMetaTag(content, "name", "twitter:image", tw.image, indent);
      changes.push({ description: `Configured twitter:image to "${tw.image}".`, reason: "X/Twitter card image." });
    }
  }

  if (changes.length === 0) {
    return {
      status: "noop",
      patchedContent: workingContent,
      manualSnippet: null,
      changes: [],
      placeholders: [],
      confidence: "high",
    };
  }

  // Note for SPA scrapers
  changes.push({
    description: "Note: In client-rendered SPAs (React + Vite), search engines execute JS, but some social scrapers (WhatsApp, Slack) only read static HTML. Keeping meta tags in index.html ensures baseline preview compatibility.",
    reason: "SPA Architecture notice.",
  });

  return {
    status: "applied",
    patchedContent: content,
    manualSnippet: null,
    changes,
    placeholders,
    confidence: placeholders.length > 0 ? "medium" : "high",
  };
}
