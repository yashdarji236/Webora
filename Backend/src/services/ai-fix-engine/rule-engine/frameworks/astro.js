import {
  splitAstroContent,
  joinAstroContent,
  inspectAstroFrontmatter,
  insertIntoAstroHead,
} from "../parsers/astroParser.js";

/**
 * Patches Astro layout template inside <head>.
 *
 * @param {Object} ctx - RuleContext
 * @param {string} workingContent
 * @param {Object} tagDefinitions
 * @returns {{ status: 'applied'|'noop'|'manual', patchedContent: string|null, manualSnippet: string|null, changes: Array, placeholders: Array, confidence: 'high'|'medium'|'low' }}
 */
export function patchAstroLayout(ctx, workingContent, tagDefinitions = {}) {
  const { hasFrontmatter, frontmatter, template } = splitAstroContent(workingContent);
  const info = inspectAstroFrontmatter(frontmatter);
  const changes = [];
  const placeholders = [];

  let updatedTemplate = template;
  let updatedFrontmatter = frontmatter;

  // Title tag
  if (tagDefinitions.title && !/<title>.*?<\/title>/i.test(template)) {
    const titleVal = info.hasTitleProp ? "{title}" : `"${tagDefinitions.title}"`;
    updatedTemplate = insertIntoAstroHead(updatedTemplate, `<title>${titleVal}</title>`);
    changes.push({
      description: "Added <title> element inside Astro <head>.",
      reason: "Sets document title in Astro layout.",
    });
  }

  // Description
  if (tagDefinitions.description && !/<meta\s+name=["']description["']/i.test(template)) {
    const descVal = info.hasDescriptionProp ? "{description}" : tagDefinitions.description;
    updatedTemplate = insertIntoAstroHead(
      updatedTemplate,
      `<meta name="description" content="${descVal}" />`
    );
    changes.push({
      description: "Added <meta name=\"description\"> in Astro layout.",
      reason: "Configures SEO description.",
    });
  }

  // Canonical
  if (tagDefinitions.canonical && !/<link\s+rel=["']canonical["']/i.test(template)) {
    updatedTemplate = insertIntoAstroHead(
      updatedTemplate,
      `<link rel="canonical" href="${tagDefinitions.canonical}" />`
    );
    changes.push({
      description: "Added canonical link element in Astro layout.",
      reason: "Sets authoritative URL.",
    });
  }

  // OpenGraph & Twitter
  if (tagDefinitions.openGraph?.title && !/<meta\s+property=["']og:title["']/i.test(template)) {
    updatedTemplate = insertIntoAstroHead(
      updatedTemplate,
      `<meta property="og:title" content="${tagDefinitions.openGraph.title}" />`
    );
    changes.push({
      description: "Added og:title meta tag in Astro layout.",
      reason: "Social preview title.",
    });
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

  return {
    status: "applied",
    patchedContent: joinAstroContent(updatedFrontmatter, updatedTemplate),
    manualSnippet: null,
    changes,
    placeholders,
    confidence: "high",
  };
}
