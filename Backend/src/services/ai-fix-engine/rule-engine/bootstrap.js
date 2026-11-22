/**
 * SEO Bootstrap Engine for MetaMend (Feature 5)
 * Detects repository SEO baseline state and generates full framework baseline setups,
 * creating missing files and merging modifications deterministically.
 */

import { buildRuleContext, normalizeFramework } from "./context.js";
import { getRuleById } from "./fixCatalog.js";
import { applyRulesToFile } from "./index.js";
import { generateUnifiedDiff } from "../patchGenerator.js";
import { calculateFileHash } from "../fileResolver.js";
import { validateTsxSyntax } from "./parsers/tsxParser.js";
import { resolveSiteName } from "./valueResolver.js";

/**
 * Detects the overall SEO baseline maturity of a repository.
 * Inspects both crawl audit findings and source code files.
 *
 * @param {Object} repoAnalysis - Repository analysis from Feature 1
 * @param {Object} [audit] - SEO audit from Feature 2
 * @param {Array<string|Object>} [fileTree=[]] - List of file paths in repository
 * @param {Object} [fileContents={}] - Map of path -> file content
 * @returns {{ level: 'none' | 'partial' | 'good', missing: string[], present: string[] }}
 */
export function detectSeoState(repoAnalysis, audit = null, fileTree = [], fileContents = {}) {
  const paths = (fileTree || []).map((f) => (typeof f === "string" ? f : f?.path || "")).filter(Boolean);
  const issues = audit?.issues || [];
  const meta = audit?.metadata || {};

  const missing = [];
  const present = [];

  // Helper to check if file content contains a string/regex
  const contentHas = (fileNameSub, regex) => {
    for (const [filePath, content] of Object.entries(fileContents || {})) {
      if (filePath.toLowerCase().includes(fileNameSub.toLowerCase()) && content) {
        if (typeof regex === "string" ? content.includes(regex) : regex.test(content)) {
          return true;
        }
      }
    }
    return false;
  };

  // 1. Title
  const hasAuditTitle = Boolean(meta.title) && !issues.some((i) => i.id === "missing-title" || i.id === "empty-title");
  const hasSourceTitle = contentHas("layout", /title/i) || contentHas("index.html", /<title>/i) || contentHas("head", /title/i);
  if (hasAuditTitle || hasSourceTitle) present.push("title");
  else missing.push("title");

  // 2. Meta Description
  const hasAuditDesc = Boolean(meta.description) && !issues.some((i) => i.id === "missing-meta-description");
  const hasSourceDesc = contentHas("layout", /description/i) || contentHas("index.html", /name=["']description["']/i) || contentHas("head", /description/i);
  if (hasAuditDesc || hasSourceDesc) present.push("metaDescription");
  else missing.push("metaDescription");

  // 3. OpenGraph / Twitter Cards
  const hasAuditOg = Boolean(meta.openGraph?.title || meta.openGraph?.image) && !issues.some((i) => i.id === "missing-og-image");
  const hasSourceOg = contentHas("layout", /openGraph|twitter/i) || contentHas("index.html", /property=["']og:|name=["']twitter:/i);
  if (hasAuditOg || hasSourceOg) present.push("openGraph");
  else missing.push("openGraph");

  // 4. Robots
  const hasTreeRobots = paths.some((p) => /robots\.(txt|ts|js)$/i.test(p));
  const hasAuditRobots = Boolean(audit?.crawl?.robots?.found) && !issues.some((i) => i.id === "missing-robots-txt");
  if (hasTreeRobots || hasAuditRobots) present.push("robots");
  else missing.push("robots");

  // 5. Sitemap
  const hasTreeSitemap = paths.some((p) => /sitemap\.(xml|ts|js)$/i.test(p));
  const hasAuditSitemap = Boolean(audit?.crawl?.sitemap?.found) && !issues.some((i) => i.id === "missing-sitemap-xml");
  if (hasTreeSitemap || hasAuditSitemap) present.push("sitemap");
  else missing.push("sitemap");

  // 6. Structured Data (JSON-LD)
  const hasAuditJsonLd = Boolean(meta.jsonLd?.length > 0) && !issues.some((i) => i.id === "missing-schema-homepage");
  const hasSourceJsonLd = contentHas("layout", /application\/ld\+json|JsonLd/i) || contentHas("index.html", /application\/ld\+json/i);
  if (hasAuditJsonLd || hasSourceJsonLd) present.push("jsonLd");
  else missing.push("jsonLd");

  // 7. HTML Lang & Viewport
  const hasAuditLang = !issues.some((i) => i.id === "missing-html-lang");
  const hasSourceLang = contentHas("layout", /lang=["']/i) || contentHas("index.html", /<html[^>]*lang=/i);
  if (hasAuditLang || hasSourceLang) present.push("htmlLang");
  else missing.push("htmlLang");

  // Level classification:
  // 'none': no title/description handling in the root layout or head, no OG/Twitter tags, no robots, no sitemap, no JSON-LD.
  // 'partial': some exist, some missing
  // 'good': all or nearly all exist (<= 1 minor missing)
  let level = "partial";
  const hasHeadTags = present.includes("title") || present.includes("metaDescription") || present.includes("openGraph");
  const hasFiles = present.includes("robots") || present.includes("sitemap");

  if (!hasHeadTags && !hasFiles) {
    level = "none";
  } else if (missing.length === 0 || (missing.length === 1 && !missing.includes("title") && !missing.includes("metaDescription"))) {
    level = "good";
  } else {
    level = "partial";
  }

  return { level, missing, present };
}

/**
 * Generates a full baseline SEO configuration for a repository (Feature 5 Bootstrap).
 *
 * @param {Object} params
 * @param {Object} params.repoAnalysis - Analysis from Feature 1
 * @param {Object} [params.audit] - Crawl audit from Feature 2
 * @param {Array<string|Object>} [params.fileTree=[]] - Repository paths
 * @param {Function} [params.fileFetcher] - Async (path) => Promise<string|null>
 * @param {Object} [params.options={}] - Custom overrides or configurations
 * @returns {Promise<Array<Object>>} List of SeoFix objects
 */
export async function generateBootstrapFixes({
  repoAnalysis,
  audit = null,
  fileTree = [],
  fileFetcher = null,
  options = {},
}) {
  const framework = normalizeFramework(repoAnalysis);
  const paths = (fileTree || []).map((f) => (typeof f === "string" ? f : f?.path || "")).filter(Boolean);

  const safeFetcher = async (p) => {
    if (typeof fileFetcher === "function") {
      try {
        const c = await fileFetcher(p);
        if (c !== null && c !== undefined) return c;
      } catch {
        // file not found
      }
    }
    return null;
  };

  const results = [];

  // ─────────────────────────────────────────────────────────────
  // 1. NEXT.JS APP ROUTER
  // ─────────────────────────────────────────────────────────────
  if (framework === "nextjs-app") {
    // 1A. Target Layout: app/layout.tsx or app/layout.js or src/app/layout.tsx
    let layoutPath = paths.find((p) => /^(src\/)?app\/layout\.(tsx|jsx|js|ts)$/i.test(p)) || "app/layout.tsx";
    let layoutContent = (await safeFetcher(layoutPath)) || "";
    const isTs = layoutPath.endsWith(".tsx") || layoutPath.endsWith(".ts");

    const layoutCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: layoutPath,
      originalContent: layoutContent,
      userOptions: options,
    });

    const layoutRules = [
      getRuleById("title"),
      getRuleById("metaDescription"),
      getRuleById("canonical"),
      getRuleById("viewport"),
      getRuleById("htmlLang"),
      getRuleById("openGraph"),
      getRuleById("twitterCard"),
    ].filter(Boolean);

    const layoutExec = applyRulesToFile({ context: layoutCtx, rules: layoutRules });
    const diffLayout = generateUnifiedDiff(layoutPath, layoutContent, layoutExec.workingContent);

    results.push({
      issueId: "bootstrap-next-app-layout",
      issueTitle: "Baseline Root Metadata & Layout Configuration",
      issueCategory: "Basic SEO",
      severity: "critical",
      affectedUrl: "/",
      framework: {
        name: repoAnalysis?.framework?.name || "Next.js",
        version: repoAnalysis?.framework?.version || "",
        router: "app",
      },
      engine: "rule",
      status: layoutExec.manualItems.length > 0 && layoutExec.appliedChanges.length === 0 ? "manual" : "proposed",
      operation: layoutContent ? "modify" : "create",
      isBootstrap: true,
      analysis: {
        rootCause: "Repository lacks a foundational SEO metadata export and viewport declaration.",
        explanation: "Configures root Metadata object, Next 14+ Viewport export, HTML lang attribute, and OpenGraph defaults.",
        recommendation: "Review default site title, description, and metadataBase.",
        risk: "low",
        riskAssessment: "AST-verified metadata insertion into root layout.",
      },
      patch: {
        filePath: layoutPath,
        action: layoutContent ? "modify" : "create",
        originalContent: layoutContent,
        proposedContent: layoutExec.workingContent,
        diff: diffLayout.diff,
        originalHash: calculateFileHash(layoutContent),
        additions: diffLayout.additions,
        deletions: diffLayout.deletions,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: layoutExec.appliedChanges,
      placeholders: layoutExec.placeholders,
      manualSnippet: layoutExec.manualItems[0]?.snippet || null,
      confidence: "high",
      ruleIds: layoutExec.ruleIdsApplied,
    });

    // 1B. app/robots.ts (create if absent, else modify)
    let robotsPath = paths.find((p) => /^(src\/)?app\/robots\.(ts|js)$/i.test(p)) || (layoutPath.startsWith("src/") ? "src/app/robots.ts" : "app/robots.ts");
    let robotsContent = await safeFetcher(robotsPath);
    const robotsExists = robotsContent !== null;

    const robotsCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: robotsPath,
      originalContent: robotsContent || "",
      userOptions: options,
    });
    const robotsRule = getRuleById("robots");
    const robotsExec = robotsRule ? robotsRule.apply(robotsCtx, robotsContent || "") : null;

    if (robotsExec && robotsExec.patchedContent) {
      const orig = robotsContent || "";
      const diffRobots = generateUnifiedDiff(robotsPath, orig, robotsExec.patchedContent);
      results.push({
        issueId: "bootstrap-next-app-robots",
        issueTitle: "Search Crawler Access Rules (robots.ts)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/robots.txt",
        framework: { name: "Next.js", router: "app" },
        engine: "rule",
        status: "proposed",
        operation: robotsExists ? "modify" : "create",
        isBootstrap: true,
        analysis: {
          rootCause: "Missing search bot access directives and sitemap URL declaration.",
          explanation: "Generates typed Next.js MetadataRoute.Robots configuration directing bots to sitemap.",
          recommendation: "Allow indexing for public paths and restrict private admin paths.",
          risk: "low",
          riskAssessment: "Standard Next.js MetadataRoute.Robots export.",
        },
        patch: {
          filePath: robotsPath,
          action: robotsExists ? "modify" : "create",
          originalContent: orig,
          proposedContent: robotsExec.patchedContent,
          diff: diffRobots.diff,
          originalHash: calculateFileHash(orig),
          additions: diffRobots.additions,
          deletions: diffRobots.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: robotsExec.changes || [],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["robots"],
      });
    }

    // 1C. app/sitemap.ts (create if absent, else modify)
    let sitemapPath = paths.find((p) => /^(src\/)?app\/sitemap\.(ts|js)$/i.test(p)) || (layoutPath.startsWith("src/") ? "src/app/sitemap.ts" : "app/sitemap.ts");
    let sitemapContent = await safeFetcher(sitemapPath);
    const sitemapExists = sitemapContent !== null;

    const sitemapCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: sitemapPath,
      originalContent: sitemapContent || "",
      userOptions: options,
    });
    const sitemapRule = getRuleById("sitemap");
    const sitemapExec = sitemapRule ? sitemapRule.apply(sitemapCtx, sitemapContent || "") : null;

    if (sitemapExec && sitemapExec.patchedContent) {
      const orig = sitemapContent || "";
      const diffSitemap = generateUnifiedDiff(sitemapPath, orig, sitemapExec.patchedContent);
      results.push({
        issueId: "bootstrap-next-app-sitemap",
        issueTitle: "Dynamic Sitemap XML Generator (sitemap.ts)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/sitemap.xml",
        framework: { name: "Next.js", router: "app" },
        engine: "rule",
        status: "proposed",
        operation: sitemapExists ? "modify" : "create",
        isBootstrap: true,
        analysis: {
          rootCause: "No sitemap detected for search engine URL discovery.",
          explanation: "Creates typed Next.js MetadataRoute.Sitemap index declaring discovered routes.",
          recommendation: "Include dynamic routes and weekly change frequency.",
          risk: "low",
          riskAssessment: "Standard Next.js MetadataRoute.Sitemap export.",
        },
        patch: {
          filePath: sitemapPath,
          action: sitemapExists ? "modify" : "create",
          originalContent: orig,
          proposedContent: sitemapExec.patchedContent,
          diff: diffSitemap.diff,
          originalHash: calculateFileHash(orig),
          additions: diffSitemap.additions,
          deletions: diffSitemap.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: sitemapExec.changes || [],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["sitemap"],
      });
    }

    // 1D. components/JsonLd.tsx
    const jsonLdPath = layoutPath.startsWith("src/") ? "src/components/JsonLd.tsx" : "components/JsonLd.tsx";
    const jsonLdContent = await safeFetcher(jsonLdPath);
    const jsonLdExists = jsonLdContent !== null;

    if (!jsonLdExists) {
      const jsonLdCode = `export default function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
`;
      const diffJson = generateUnifiedDiff(jsonLdPath, "", jsonLdCode);
      results.push({
        issueId: "bootstrap-next-jsonld-component",
        issueTitle: "Structured Data Component (components/JsonLd.tsx)",
        issueCategory: "Structured Data",
        severity: "medium",
        affectedUrl: "/",
        framework: { name: "Next.js", router: "app" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "No reusable structured data component for Schema.org JSON-LD.",
          explanation: "Creates a typed React component for rendering script tags with JSON-LD schema.",
          recommendation: "Import and render in app/layout.tsx with WebSite and Organization schema.",
          risk: "low",
          riskAssessment: "Isolated new component file.",
        },
        patch: {
          filePath: jsonLdPath,
          action: "create",
          originalContent: "",
          proposedContent: jsonLdCode,
          diff: diffJson.diff,
          originalHash: "",
          additions: diffJson.additions,
          deletions: diffJson.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Created components/JsonLd.tsx for Schema.org JSON-LD rendering.", reason: "Enables Google Rich Results." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["jsonLd"],
      });
    }

    // 1E. Manual Note for app/opengraph-image
    results.push({
      issueId: "bootstrap-next-og-image-note",
      issueTitle: "Social Share Card (app/opengraph-image)",
      issueCategory: "Social Metadata",
      severity: "medium",
      affectedUrl: "/opengraph-image",
      framework: { name: "Next.js", router: "app" },
      engine: "rule",
      status: "manual",
      operation: "create",
      isBootstrap: true,
      analysis: {
        rootCause: "Next.js App Router supports file-based OpenGraph images automatically.",
        explanation: "Add an opengraph-image.png (1200x630px) or opengraph-image.tsx dynamic route inside your app/ directory.",
        recommendation: "Place an image file named opengraph-image.png (1200x630) directly in app/.",
        risk: "low",
        riskAssessment: "Static asset placement.",
      },
      patch: {
        filePath: "app/opengraph-image.png",
        action: "create",
        originalContent: "",
        proposedContent: "",
        diff: "(Manual asset placement required)",
        originalHash: "",
        additions: 0,
        deletions: 0,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: [],
      placeholders: [],
      manualSnippet: `// Place a 1200x630 image at:
// app/opengraph-image.png
// Next.js will automatically generate <meta property="og:image"> and twitter card tags.`,
      confidence: "high",
      ruleIds: ["openGraph"],
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. NEXT.JS PAGES ROUTER
  // ─────────────────────────────────────────────────────────────
  else if (framework === "nextjs-pages") {
    // 2A. pages/_document.tsx
    let docPath = paths.find((p) => /pages\/_document\.(tsx|jsx|js|ts)$/i.test(p)) || "pages/_document.tsx";
    let docContent = (await safeFetcher(docPath)) || "";

    const docCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: docPath,
      originalContent: docContent,
      userOptions: options,
    });
    const docRules = [getRuleById("htmlLang")].filter(Boolean);
    const docExec = applyRulesToFile({ context: docCtx, rules: docRules });
    const diffDoc = generateUnifiedDiff(docPath, docContent, docExec.workingContent);

    if (docExec.appliedChanges.length > 0 || !docContent) {
      results.push({
        issueId: "bootstrap-next-pages-document",
        issueTitle: "Document Root Language & Head Baseline",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/",
        framework: { name: "Next.js", router: "pages" },
        engine: "rule",
        status: "proposed",
        operation: docContent ? "modify" : "create",
        isBootstrap: true,
        analysis: {
          rootCause: "HTML lang attribute missing on <Html> element.",
          explanation: "Patches pages/_document.tsx to add lang='en' attribute to root document.",
          recommendation: "Ensure language is declared for search crawlers.",
          risk: "low",
          riskAssessment: "AST-verified _document modification.",
        },
        patch: {
          filePath: docPath,
          action: docContent ? "modify" : "create",
          originalContent: docContent,
          proposedContent: docExec.workingContent,
          diff: diffDoc.diff,
          originalHash: calculateFileHash(docContent),
          additions: diffDoc.additions,
          deletions: diffDoc.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: docExec.appliedChanges,
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: docExec.ruleIdsApplied,
      });
    }

    // 2B. Reusable Seo Component: components/Seo.tsx
    const seoCompPath = "components/Seo.tsx";
    const seoCompContent = await safeFetcher(seoCompPath);
    if (!seoCompContent) {
      const siteName = resolveSiteName(docCtx);
      const seoCode = `import Head from 'next/head';

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}

export default function Seo({
  title = '${siteName}',
  description = 'Web application built with Next.js',
  canonical = '',
  ogImage = '',
}: SeoProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
}
`;
      const diffSeo = generateUnifiedDiff(seoCompPath, "", seoCode);
      results.push({
        issueId: "bootstrap-next-pages-seo-component",
        issueTitle: "Reusable Head Metadata Component (components/Seo.tsx)",
        issueCategory: "Basic SEO",
        severity: "critical",
        affectedUrl: "/",
        framework: { name: "Next.js", router: "pages" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "No shared Head metadata wrapper for Pages Router views.",
          explanation: "Creates components/Seo.tsx wrapper using next/head for title, meta description, and social tags.",
          recommendation: "Import and render <Seo /> in pages/_app.tsx or individual routes.",
          risk: "low",
          riskAssessment: "New reusable component.",
        },
        patch: {
          filePath: seoCompPath,
          action: "create",
          originalContent: "",
          proposedContent: seoCode,
          diff: diffSeo.diff,
          originalHash: "",
          additions: diffSeo.additions,
          deletions: diffSeo.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Created components/Seo.tsx reusable head metadata component.", reason: "Provides centralized SEO tag management for Next.js Pages." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["title", "metaDescription", "openGraph", "twitterCard"],
      });
    }

    // 2C. public/robots.txt
    const robotsPath = "public/robots.txt";
    const existingRobots = await safeFetcher(robotsPath);
    if (!existingRobots) {
      const siteUrl = docCtx.siteUrl.replace(/\/$/, "");
      const content = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
      const diffRobots = generateUnifiedDiff(robotsPath, "", content);
      results.push({
        issueId: "bootstrap-pages-robots",
        issueTitle: "Public Search Crawler Directives (public/robots.txt)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/robots.txt",
        framework: { name: "Next.js", router: "pages" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "public/robots.txt file missing.",
          explanation: "Creates public/robots.txt permitting search crawler indexing and linking sitemap.",
          recommendation: "Ensure robots.txt is served from the domain root.",
          risk: "low",
          riskAssessment: "Standard static robots.txt.",
        },
        patch: {
          filePath: robotsPath,
          action: "create",
          originalContent: "",
          proposedContent: content,
          diff: diffRobots.diff,
          originalHash: "",
          additions: diffRobots.additions,
          deletions: diffRobots.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Generated public/robots.txt.", reason: "Declares search bot permissions." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["robots"],
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. REACT + VITE
  // ─────────────────────────────────────────────────────────────
  else if (framework === "react-vite") {
    // 3A. index.html
    const indexPath = "index.html";
    let indexContent = (await safeFetcher(indexPath)) || "";

    const indexCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: indexPath,
      originalContent: indexContent,
      userOptions: options,
    });

    const indexRules = [
      getRuleById("htmlLang"),
      getRuleById("title"),
      getRuleById("metaDescription"),
      getRuleById("viewport"),
      getRuleById("charset"),
      getRuleById("canonical"),
      getRuleById("openGraph"),
      getRuleById("twitterCard"),
      getRuleById("jsonLd"),
    ].filter(Boolean);

    const indexExec = applyRulesToFile({ context: indexCtx, rules: indexRules });
    const diffIndex = generateUnifiedDiff(indexPath, indexContent, indexExec.workingContent);

    results.push({
      issueId: "bootstrap-react-vite-index",
      issueTitle: "Full HTML Head Metadata Baseline (index.html)",
      issueCategory: "Basic SEO",
      severity: "critical",
      affectedUrl: "/",
      framework: { name: "React + Vite" },
      engine: "rule",
      status: "proposed",
      operation: indexContent ? "modify" : "create",
      isBootstrap: true,
      analysis: {
        rootCause: "index.html lacks complete search and social metadata declarations.",
        explanation: "Injects title, description, viewport, charset, canonical, OpenGraph, Twitter, and JSON-LD schema into <head>.",
        recommendation: "Ensure client-rendered single page app metadata is present in static root HTML.",
        risk: "low",
        riskAssessment: "Safe <head> tag insertion preserving existing structure.",
      },
      patch: {
        filePath: indexPath,
        action: indexContent ? "modify" : "create",
        originalContent: indexContent,
        proposedContent: indexExec.workingContent,
        diff: diffIndex.diff,
        originalHash: calculateFileHash(indexContent),
        additions: diffIndex.additions,
        deletions: diffIndex.deletions,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: indexExec.appliedChanges,
      placeholders: indexExec.placeholders,
      manualSnippet: null,
      confidence: "high",
      ruleIds: indexExec.ruleIdsApplied,
    });

    // 3B. public/robots.txt
    const robotsPath = "public/robots.txt";
    const existingRobots = await safeFetcher(robotsPath);
    if (!existingRobots) {
      const siteUrl = indexCtx.siteUrl.replace(/\/$/, "");
      const content = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
      const diffRobots = generateUnifiedDiff(robotsPath, "", content);
      results.push({
        issueId: "bootstrap-react-robots",
        issueTitle: "Static Search Crawler Directives (public/robots.txt)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/robots.txt",
        framework: { name: "React + Vite" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "public/robots.txt missing from static assets directory.",
          explanation: "Generates public/robots.txt allowing bot indexing.",
          recommendation: "Deploy robots.txt in public assets folder.",
          risk: "low",
          riskAssessment: "Static asset creation.",
        },
        patch: {
          filePath: robotsPath,
          action: "create",
          originalContent: "",
          proposedContent: content,
          diff: diffRobots.diff,
          originalHash: "",
          additions: diffRobots.additions,
          deletions: diffRobots.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Generated public/robots.txt.", reason: "Guides search engine crawlers." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["robots"],
      });
    }

    // 3C. public/sitemap.xml
    const sitemapPath = "public/sitemap.xml";
    const existingSitemap = await safeFetcher(sitemapPath);
    if (!existingSitemap) {
      const siteUrl = indexCtx.siteUrl.replace(/\/$/, "");
      const visited = audit?.crawl?.visitedUrls || ["/"];
      const urlsXml = visited
        .map((u) => {
          const loc = u.startsWith("http") ? u : `${siteUrl}${u.startsWith("/") ? u : `/${u}`}`;
          return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;
      const diffSitemap = generateUnifiedDiff(sitemapPath, "", xml);
      results.push({
        issueId: "bootstrap-react-sitemap",
        issueTitle: "Static Sitemap XML (public/sitemap.xml)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/sitemap.xml",
        framework: { name: "React + Vite" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "No sitemap.xml found in public/ directory.",
          explanation: "Generates public/sitemap.xml with crawled and root routes.",
          recommendation: "Ensure search engines have access to public/sitemap.xml.",
          risk: "low",
          riskAssessment: "Static asset creation.",
        },
        patch: {
          filePath: sitemapPath,
          action: "create",
          originalContent: "",
          proposedContent: xml,
          diff: diffSitemap.diff,
          originalHash: "",
          additions: diffSitemap.additions,
          deletions: diffSitemap.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Generated public/sitemap.xml.", reason: "Provides sitemap index for search crawlers." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["sitemap"],
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ASTRO
  // ─────────────────────────────────────────────────────────────
  else if (framework === "astro") {
    const layoutPath = paths.find((p) => /src\/layouts\/.*\.astro$/i.test(p)) || "src/layouts/Layout.astro";
    let layoutContent = (await safeFetcher(layoutPath)) || "";

    const astroCtx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath: layoutPath,
      originalContent: layoutContent,
      userOptions: options,
    });

    const astroRules = [
      getRuleById("title"),
      getRuleById("metaDescription"),
      getRuleById("canonical"),
      getRuleById("openGraph"),
      getRuleById("twitterCard"),
    ].filter(Boolean);

    const astroExec = applyRulesToFile({ context: astroCtx, rules: astroRules });
    const diffAstro = generateUnifiedDiff(layoutPath, layoutContent, astroExec.workingContent);

    results.push({
      issueId: "bootstrap-astro-layout",
      issueTitle: "Astro Root Layout SEO Baseline",
      issueCategory: "Basic SEO",
      severity: "critical",
      affectedUrl: "/",
      framework: { name: "Astro" },
      engine: "rule",
      status: "proposed",
      operation: layoutContent ? "modify" : "create",
      isBootstrap: true,
      analysis: {
        rootCause: "Astro layout lacks complete metadata declarations in <head>.",
        explanation: "Injects canonical, description, OpenGraph, and Twitter tags into Layout.astro.",
        recommendation: "Review Astro layout props for dynamic title and description overrides.",
        risk: "low",
        riskAssessment: "Surgical <head> tag insertion.",
      },
      patch: {
        filePath: layoutPath,
        action: layoutContent ? "modify" : "create",
        originalContent: layoutContent,
        proposedContent: astroExec.workingContent,
        diff: diffAstro.diff,
        originalHash: calculateFileHash(layoutContent),
        additions: diffAstro.additions,
        deletions: diffAstro.deletions,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: astroExec.appliedChanges,
      placeholders: astroExec.placeholders,
      manualSnippet: null,
      confidence: "high",
      ruleIds: astroExec.ruleIdsApplied,
    });

    // public/robots.txt
    const robotsPath = "public/robots.txt";
    const existingRobots = await safeFetcher(robotsPath);
    if (!existingRobots) {
      const siteUrl = astroCtx.siteUrl.replace(/\/$/, "");
      const content = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
      const diffRobots = generateUnifiedDiff(robotsPath, "", content);
      results.push({
        issueId: "bootstrap-astro-robots",
        issueTitle: "Public Search Crawler Directives (public/robots.txt)",
        issueCategory: "Technical SEO",
        severity: "high",
        affectedUrl: "/robots.txt",
        framework: { name: "Astro" },
        engine: "rule",
        status: "proposed",
        operation: "create",
        isBootstrap: true,
        analysis: {
          rootCause: "Astro public/robots.txt missing.",
          explanation: "Creates public/robots.txt directing crawlers to the sitemap.",
          recommendation: "Ensure robots.txt is present in the public/ folder.",
          risk: "low",
          riskAssessment: "Static asset creation.",
        },
        patch: {
          filePath: robotsPath,
          action: "create",
          originalContent: "",
          proposedContent: content,
          diff: diffRobots.diff,
          originalHash: "",
          additions: diffRobots.additions,
          deletions: diffRobots.deletions,
        },
        validation: { status: "valid", warnings: [], errors: [] },
        changes: [{ description: "Generated public/robots.txt.", reason: "Declares search bot permissions." }],
        placeholders: [],
        manualSnippet: null,
        confidence: "high",
        ruleIds: ["robots"],
      });
    }

    // Manual Note for @astrojs/sitemap
    results.push({
      issueId: "bootstrap-astro-sitemap-note",
      issueTitle: "Astro Sitemap Integration (@astrojs/sitemap)",
      issueCategory: "Technical SEO",
      severity: "medium",
      affectedUrl: "/sitemap.xml",
      framework: { name: "Astro" },
      engine: "rule",
      status: "manual",
      operation: "modify",
      isBootstrap: true,
      analysis: {
        rootCause: "Astro uses @astrojs/sitemap package for build-time sitemap generation.",
        explanation: "Run 'npx astro add sitemap' to automatically configure astro.config.mjs and generate sitemap.xml upon build.",
        recommendation: "Add @astrojs/sitemap integration to astro.config.mjs.",
        risk: "low",
        riskAssessment: "Astro official integration.",
      },
      patch: {
        filePath: "astro.config.mjs",
        action: "modify",
        originalContent: "",
        proposedContent: "",
        diff: "(Manual package integration required)",
        originalHash: "",
        additions: 0,
        deletions: 0,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: [],
      placeholders: [],
      manualSnippet: `// Terminal command:\nnpx astro add sitemap\n\n// In astro.config.mjs:\nimport sitemap from '@astrojs/sitemap';\nexport default defineConfig({\n  site: 'https://example.com',\n  integrations: [sitemap()],\n});`,
      confidence: "high",
      ruleIds: ["sitemap"],
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. REMIX / NUXT / UNKNOWN
  // ─────────────────────────────────────────────────────────────
  else {
    const isRemix = framework === "remix";
    const snippet = isRemix
      ? `import type { MetaFunction } from "@remix-run/node";\n\nexport const meta: MetaFunction = () => [\n  { title: "Your Site Title" },\n  { name: "description", content: "Your website description." },\n  { name: "viewport", content: "width=device-width,initial-scale=1" },\n];`
      : `useSeoMeta({\n  title: 'Your Site Title',\n  description: 'Your website description.',\n  ogTitle: 'Your Site Title',\n  ogDescription: 'Your website description.',\n});`;

    results.push({
      issueId: `bootstrap-${framework}-manual`,
      issueTitle: `${isRemix ? "Remix" : "Nuxt"} SEO Baseline Configuration`,
      issueCategory: "Basic SEO",
      severity: "critical",
      affectedUrl: "/",
      framework: { name: isRemix ? "Remix" : "Nuxt" },
      engine: "rule",
      status: "manual",
      operation: "modify",
      isBootstrap: true,
      analysis: {
        rootCause: `${isRemix ? "Remix" : "Nuxt"} requires framework-specific meta integration.`,
        explanation: `Manual integration recommended for ${isRemix ? "MetaFunction" : "useSeoMeta"}.`,
        recommendation: `Insert snippet into root route.`,
        risk: "low",
        riskAssessment: "Framework idiomatic snippet provided.",
      },
      patch: {
        filePath: isRemix ? "app/root.tsx" : "app.vue",
        action: "modify",
        originalContent: "",
        proposedContent: "",
        diff: "(Manual integration required)",
        originalHash: "",
        additions: 0,
        deletions: 0,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: [],
      placeholders: [],
      manualSnippet: snippet,
      confidence: "high",
      ruleIds: ["title", "metaDescription"],
    });
  }

  return results;
}

/**
 * Merges bootstrap baseline fixes with targeted audit fixes, ensuring each file
 * gets exactly ONE combined patch without competing or duplicate edits.
 *
 * @param {Array<Object>} bootstrapFixes
 * @param {Array<Object>} targetedFixes
 * @returns {Array<Object>} Deduplicated, unified fixes
 */
export function combineBootstrapWithTargetedFixes(bootstrapFixes = [], targetedFixes = []) {
  const mergedMap = new Map(); // filePath -> fix

  // 1. Add targeted fixes first
  for (const fix of targetedFixes) {
    const path = fix.patch?.filePath || fix.issueId;
    mergedMap.set(path, fix);
  }

  // 2. Add or merge bootstrap fixes
  for (const boot of bootstrapFixes) {
    const path = boot.patch?.filePath || boot.issueId;
    if (!mergedMap.has(path)) {
      mergedMap.set(path, boot);
    } else {
      // If a targeted fix exists for this file, preserve the targeted fix
      // and combine applied changes and ruleIds
      const existing = mergedMap.get(path);
      const combinedRuleIds = Array.from(new Set([...(existing.ruleIds || []), ...(boot.ruleIds || [])]));
      existing.ruleIds = combinedRuleIds;
      if (boot.isBootstrap) existing.isBootstrap = true;
    }
  }

  return Array.from(mergedMap.values());
}
