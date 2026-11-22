/**
 * Value Resolver
 * Resolves metadata values following strict priority rules without fabricating fake marketing copy.
 */

/**
 * Truncates text on a word boundary if exceeding maxLength
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateWordBoundary(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  const sub = text.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    return sub.slice(0, lastSpace).trim();
  }
  return sub.trim();
}

/**
 * Resolves page title
 * @param {Object} ctx - RuleContext
 * @param {string} [existingInSource]
 * @returns {{ value: string, placeholder: boolean, confidence: 'high' | 'medium' | 'low' }}
 */
export function resolveTitle(ctx, existingInSource = "") {
  // 1. User override
  if (ctx.userOptions?.overrides?.title?.trim()) {
    return {
      value: ctx.userOptions.overrides.title.trim(),
      placeholder: false,
      confidence: "high",
    };
  }

  // 2. Existing in source
  if (existingInSource && existingInSource.trim()) {
    const raw = existingInSource.trim();
    if (raw.length > 70) {
      return {
        value: truncateWordBoundary(raw, 60),
        placeholder: false,
        confidence: "medium",
      };
    }
    return { value: raw, placeholder: false, confidence: "high" };
  }

  // 3. Live crawled page title
  if (ctx.crawl?.title && ctx.crawl.title.trim()) {
    const raw = ctx.crawl.title.trim();
    if (raw.length > 70) {
      return {
        value: truncateWordBoundary(raw, 60),
        placeholder: false,
        confidence: "medium",
      };
    }
    return { value: raw, placeholder: false, confidence: "high" };
  }

  // 4. Derived from H1 + siteName/package name
  const h1 = ctx.crawl?.h1?.trim();
  const site = ctx.userOptions?.overrides?.siteName || ctx.crawl?.siteName || ctx.packageJson?.name || "";

  if (h1 && site && !h1.toLowerCase().includes(site.toLowerCase())) {
    const derived = `${h1} | ${site}`;
    return {
      value: derived.length <= 60 ? derived : truncateWordBoundary(derived, 60),
      placeholder: false,
      confidence: "medium",
    };
  }

  if (h1) {
    return {
      value: h1.length <= 60 ? h1 : truncateWordBoundary(h1, 60),
      placeholder: false,
      confidence: "medium",
    };
  }

  if (site) {
    return { value: site, placeholder: false, confidence: "medium" };
  }

  // 5. Placeholder
  return {
    value: "TODO: Add a 30-60 character page title",
    placeholder: true,
    confidence: "low",
  };
}

/**
 * Resolves meta description
 * @param {Object} ctx - RuleContext
 * @param {string} [existingInSource]
 * @returns {{ value: string, placeholder: boolean, confidence: 'high' | 'medium' | 'low' }}
 */
export function resolveMetaDescription(ctx, existingInSource = "") {
  // 1. User override
  if (ctx.userOptions?.overrides?.description?.trim()) {
    return {
      value: ctx.userOptions.overrides.description.trim(),
      placeholder: false,
      confidence: "high",
    };
  }

  // 2. Existing in source
  if (existingInSource && existingInSource.trim()) {
    const raw = existingInSource.trim();
    if (raw.length > 165) {
      return {
        value: truncateWordBoundary(raw, 155),
        placeholder: false,
        confidence: "medium",
      };
    }
    return { value: raw, placeholder: false, confidence: "high" };
  }

  // 3. Live crawled page description
  if (ctx.crawl?.description && ctx.crawl.description.trim()) {
    const raw = ctx.crawl.description.trim();
    if (raw.length > 165) {
      return {
        value: truncateWordBoundary(raw, 155),
        placeholder: false,
        confidence: "medium",
      };
    }
    return { value: raw, placeholder: false, confidence: "high" };
  }

  // 4. Derived from package.json description
  if (ctx.packageJson?.description && ctx.packageJson.description.trim()) {
    const raw = ctx.packageJson.description.trim();
    return {
      value: raw.length <= 160 ? raw : truncateWordBoundary(raw, 155),
      placeholder: false,
      confidence: "medium",
    };
  }

  // 5. Placeholder
  return {
    value: "TODO: Add a 120-160 character description",
    placeholder: true,
    confidence: "low",
  };
}

/**
 * Resolves Canonical URL
 * @param {Object} ctx
 * @param {string} [existingInSource]
 * @returns {string}
 */
export function resolveCanonicalUrl(ctx, existingInSource = "") {
  if (ctx.userOptions?.overrides?.siteUrl?.trim()) {
    return ctx.userOptions.overrides.siteUrl.trim();
  }
  if (existingInSource && (existingInSource.startsWith("http://") || existingInSource.startsWith("https://"))) {
    return existingInSource.trim();
  }
  return ctx.crawl?.canonical || ctx.siteUrl || "https://example.com";
}

/**
 * Resolves OpenGraph and Twitter Image URL
 * @param {Object} ctx
 * @param {string} [existingInSource]
 * @returns {{ value: string|null, placeholder: boolean }}
 */
export function resolveSocialImage(ctx, existingInSource = "") {
  if (ctx.userOptions?.overrides?.ogImage?.trim()) {
    return { value: ctx.userOptions.overrides.ogImage.trim(), placeholder: false };
  }
  if (existingInSource && existingInSource.trim()) {
    return { value: existingInSource.trim(), placeholder: false };
  }
  if (ctx.crawl?.ogImage && ctx.crawl.ogImage.trim()) {
    return { value: ctx.crawl.ogImage.trim(), placeholder: false };
  }
  return { value: null, placeholder: false };
}

/**
 * Resolves Site Name
 * @param {Object} ctx
 * @returns {string}
 */
export function resolveSiteName(ctx) {
  return (
    ctx.userOptions?.overrides?.siteName ||
    ctx.crawl?.siteName ||
    ctx.packageJson?.name ||
    "MetaMend"
  );
}

/**
 * Resolves HTML Lang
 * @param {Object} ctx
 * @returns {string}
 */
export function resolveLang(ctx) {
  return ctx.crawl?.lang || "en";
}
