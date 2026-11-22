/**
 * Astro Layout Parser & Editor
 * Splits frontmatter (--- ... ---) from template and performs safe edits inside <head>.
 */

/**
 * Splits an Astro file into frontmatter and template portions.
 * @param {string} content
 * @returns {{ hasFrontmatter: boolean, frontmatter: string, template: string }}
 */
export function splitAstroContent(content) {
  const normalized = (content || "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      hasFrontmatter: false,
      frontmatter: "",
      template: normalized,
    };
  }

  return {
    hasFrontmatter: true,
    frontmatter: match[1],
    template: match[2],
  };
}

/**
 * Recombines frontmatter and template.
 * @param {string} frontmatter
 * @param {string} template
 * @returns {string}
 */
export function joinAstroContent(frontmatter, template) {
  if (!frontmatter) return template;
  return `---\n${frontmatter.trim()}\n---\n\n${template.trimStart()}`;
}

/**
 * Inspects frontmatter to check if Props interface or Astro.props destructuring exists.
 * @param {string} frontmatter
 * @returns {{ hasProps: boolean, hasTitleProp: boolean, hasDescriptionProp: boolean }}
 */
export function inspectAstroFrontmatter(frontmatter) {
  const hasTitleProp = /\btitle\b/.test(frontmatter);
  const hasDescriptionProp = /\bdescription\b/.test(frontmatter);
  const hasProps = /Astro\.props/.test(frontmatter) || /interface\s+Props/.test(frontmatter);

  return {
    hasProps,
    hasTitleProp,
    hasDescriptionProp,
  };
}

/**
 * Inserts tags inside <head> of an Astro template before </head>.
 * @param {string} template
 * @param {string} tagString
 * @param {string} [indent='    ']
 * @returns {string}
 */
export function insertIntoAstroHead(template, tagString, indent = "    ") {
  const closingHeadMatch = template.match(/([ \t]*)<\/head>/i);
  if (!closingHeadMatch) return template;

  const closingIndent = closingHeadMatch[1] || "";
  const insertion = `${indent}${tagString}\n${closingIndent}`;
  return template.replace(/([ \t]*)<\/head>/i, `${insertion}</head>`);
}
