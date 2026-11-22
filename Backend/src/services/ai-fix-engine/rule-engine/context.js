/**
 * Rule Context Builder
 * Normalizes framework, file, crawl, and user options into a unified RuleContext object.
 *
 * @typedef {Object} RuleContext
 * @property {'nextjs-app' | 'nextjs-pages' | 'react-vite' | 'astro' | 'remix' | 'nuxt' | 'unknown'} framework
 * @property {string|null} frameworkVersion
 * @property {boolean} usesTypeScript
 * @property {string} filePath
 * @property {string} originalContent
 * @property {string} siteUrl
 * @property {Object} crawl
 * @property {string} [crawl.title]
 * @property {string} [crawl.description]
 * @property {string} [crawl.h1]
 * @property {string} [crawl.ogImage]
 * @property {string} [crawl.favicon]
 * @property {string} [crawl.lang]
 * @property {string} [crawl.siteName]
 * @property {string} [crawl.canonical]
 * @property {{ name?: string, description?: string }|null} packageJson
 * @property {{ overrides?: { title?: string, description?: string, ogImage?: string, siteName?: string, twitterHandle?: string } }} userOptions
 */

/**
 * Resolves normalized framework identifier from repository analysis
 * @param {Object} repoAnalysis
 * @param {string} [filePath='']
 * @returns {'nextjs-app' | 'nextjs-pages' | 'react-vite' | 'astro' | 'remix' | 'nuxt' | 'unknown'}
 */
export function normalizeFramework(repoAnalysis, filePath = "") {
  const fwSlug = (repoAnalysis?.framework?.slug || repoAnalysis?.framework?.name || "").toLowerCase();
  const routerType = (repoAnalysis?.router?.type || "").toLowerCase();
  const importantFiles = (repoAnalysis?.structure?.importantFiles || []).map((f) =>
    typeof f === "string" ? f : f?.path || ""
  );

  if (fwSlug.includes("next")) {
    const isPages =
      routerType.includes("pages") ||
      filePath.startsWith("pages/") ||
      filePath.startsWith("src/pages/") ||
      (importantFiles.some((f) => f.startsWith("pages/") || f.startsWith("src/pages/")) &&
        !importantFiles.some((f) => f.startsWith("app/") || f.startsWith("src/app/")));
    return isPages ? "nextjs-pages" : "nextjs-app";
  }

  if (fwSlug.includes("astro")) return "astro";
  if (fwSlug.includes("remix")) return "remix";
  if (fwSlug.includes("nuxt")) return "nuxt";
  if (fwSlug.includes("react") || fwSlug.includes("vite")) return "react-vite";

  // Check file heuristics
  if (filePath.startsWith("app/") || filePath.startsWith("src/app/")) return "nextjs-app";
  if (filePath.startsWith("pages/") || filePath.startsWith("src/pages/")) return "nextjs-pages";
  if (filePath.endsWith(".astro")) return "astro";
  if (filePath === "index.html") return "react-vite";

  return "unknown";
}

/**
 * Builds RuleContext from inputs
 * @param {Object} params
 * @returns {RuleContext}
 */
export function buildRuleContext({
  repoAnalysis,
  audit,
  filePath,
  originalContent = "",
  userOptions = {},
}) {
  const framework = normalizeFramework(repoAnalysis, filePath);
  const frameworkVersion = repoAnalysis?.framework?.version || null;

  const importantFiles = (repoAnalysis?.structure?.importantFiles || []).map((f) =>
    typeof f === "string" ? f : f?.path || ""
  );
  const usesTypeScript =
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    importantFiles.some((f) => f.endsWith(".ts") || f.endsWith(".tsx") || f === "tsconfig.json");

  // Extract siteUrl from audit or fallback
  const siteUrl = audit?.siteUrl || audit?.url || audit?.startUrl || "https://example.com";

  // Extract crawled metadata
  const meta = audit?.metadata || {};
  const homepage = audit?.crawlData?.pages?.[0] || {};

  const crawl = {
    title: meta.title || homepage.title || "",
    description: meta.description || homepage.metaDescription || "",
    h1: meta.h1 || homepage.headings?.h1?.[0] || "",
    ogImage: meta.ogImage || homepage.openGraph?.image || "",
    favicon: meta.favicon || homepage.favicon || "",
    lang: meta.lang || homepage.htmlLang || "en",
    siteName: meta.siteName || meta.ogSiteName || homepage.openGraph?.siteName || "",
    canonical: meta.canonical || homepage.canonical || siteUrl,
  };

  const packageJson = repoAnalysis?.packageJson || repoAnalysis?.pkg || null;

  return {
    framework,
    frameworkVersion,
    usesTypeScript,
    filePath,
    originalContent,
    siteUrl,
    crawl,
    packageJson,
    userOptions: {
      overrides: userOptions.overrides || {},
    },
  };
}
