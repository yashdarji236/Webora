/**
 * Preview Patch Service
 * Generates deterministic source-code patches and diffs from Visual Social & Search Preview edits
 * (Page Title, Favicon, Meta Description, Canonical, OG, Twitter).
 */

import { normalizeFramework } from "./rule-engine/context.js";
import { patchNextAppRouterLayout } from "./rule-engine/frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "./rule-engine/frameworks/reactVite.js";
import { patchAstroLayout } from "./rule-engine/frameworks/astro.js";
import { generateUnifiedDiff } from "./patchGenerator.js";
import { calculateFileHash } from "./fileResolver.js";
import { validateCode } from "./codeValidator.js";

/**
 * Resolves candidate file path for preview metadata patch based on framework and structure.
 * @param {Object} repoAnalysis
 * @returns {string[]} Candidate relative paths
 */
export function getPreviewTargetCandidates(repoAnalysis) {
  const framework = normalizeFramework(repoAnalysis);
  const importantFiles = (repoAnalysis?.structure?.importantFiles || []).map((f) =>
    typeof f === "string" ? f : f?.path || ""
  );

  if (framework === "nextjs-app") {
    // Prefer existing file if found in importantFiles
    const existing = importantFiles.find((f) =>
      ["app/layout.tsx", "app/layout.js", "src/app/layout.tsx", "src/app/layout.js"].includes(f)
    );
    if (existing) return [existing];
    return ["app/layout.tsx", "app/layout.js", "src/app/layout.tsx", "src/app/layout.js"];
  }

  if (framework === "nextjs-pages") {
    const existing = importantFiles.find((f) =>
      [
        "pages/_document.tsx",
        "pages/_document.js",
        "src/pages/_document.tsx",
        "pages/_app.tsx",
        "pages/_app.js",
        "pages/index.tsx",
      ].includes(f)
    );
    if (existing) return [existing];
    return [
      "pages/_document.tsx",
      "pages/_document.js",
      "src/pages/_document.tsx",
      "pages/_app.tsx",
      "pages/_app.js",
      "pages/index.tsx",
    ];
  }

  if (framework === "astro") {
    const existing = importantFiles.find((f) =>
      ["src/layouts/Layout.astro", "src/layouts/BaseLayout.astro"].includes(f)
    );
    if (existing) return [existing];
    return ["src/layouts/Layout.astro", "src/layouts/BaseLayout.astro", "src/pages/index.astro"];
  }

  if (framework === "remix") {
    const existing = importantFiles.find((f) => ["app/root.tsx", "app/root.jsx"].includes(f));
    if (existing) return [existing];
    return ["app/root.tsx", "app/root.jsx"];
  }

  // React + Vite, CRA, or static HTML
  const existingHtml = importantFiles.find((f) =>
    ["index.html", "public/index.html"].includes(f)
  );
  if (existingHtml) return [existingHtml];

  const anyLayout = importantFiles.find((f) =>
    /(layout|index|_document)\.(tsx?|jsx?|astro|html)$/i.test(f)
  );
  if (anyLayout) return [anyLayout, "index.html", "public/index.html"];

  return ["index.html", "public/index.html"];
}

/**
 * Generates unified patch and diff for user-edited preview metadata.
 *
 * @param {Object} params
 * @param {Object} params.repoAnalysis
 * @param {string} params.targetPath
 * @param {string} [params.originalContent='']
 * @param {Object} params.metadata - { title, description, favicon, canonical, openGraph, twitter }
 * @param {Object} [params.options={}]
 * @returns {Object} Patch result with diff, changes, and validated code
 */
export function generatePreviewMetadataPatch({
  repoAnalysis,
  targetPath,
  originalContent = "",
  metadata = {},
  options = {},
}) {
  const framework = normalizeFramework(repoAnalysis);

  let effectiveOriginal = originalContent;
  if (!effectiveOriginal || !effectiveOriginal.trim()) {
    if (framework === "nextjs-app" || targetPath.includes("layout")) {
      effectiveOriginal = `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${metadata.title || "App"}",
  description: "${metadata.description || "Web application"}",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;
    }
  }

  const ctx = {
    framework,
    frameworkVersion: repoAnalysis?.framework?.version || null,
    usesTypeScript: /\.(tsx?|ts)$/i.test(targetPath),
    originalContent: effectiveOriginal,
    filePath: targetPath,
    userOptions: { forceUpdate: true, ...options },
  };

  let res;

  if (framework === "astro" || targetPath.endsWith(".astro")) {
    res = patchAstroLayout(ctx, effectiveOriginal, {
      title: metadata.title,
      description: metadata.description,
      favicon: metadata.favicon,
      canonical: metadata.canonical,
      openGraph: metadata.openGraph,
      twitter: metadata.twitter,
    });
  } else if (framework === "nextjs-app" || (framework !== "react-vite" && targetPath.includes("layout"))) {
    const metadataEntries = {
      _forceUpdate: true,
      title: metadata.title,
      description: metadata.description,
      favicon: metadata.favicon,
      icons: metadata.favicon ? { icon: metadata.favicon } : undefined,
      alternates: metadata.canonical ? { canonical: metadata.canonical } : undefined,
      openGraph: metadata.openGraph
        ? {
            title: metadata.openGraph.title || metadata.title,
            description: metadata.openGraph.description || metadata.description,
            url: metadata.openGraph.url || metadata.canonical,
            siteName: metadata.openGraph.siteName,
            images: metadata.openGraph.image ? [{ url: metadata.openGraph.image }] : undefined,
          }
        : undefined,
      twitter: metadata.twitter
        ? {
            card: metadata.twitter.card || "summary_large_image",
            title: metadata.twitter.title || metadata.title,
            description: metadata.twitter.description || metadata.description,
            images: metadata.twitter.image ? [metadata.twitter.image] : undefined,
            site: metadata.twitter.site,
          }
        : undefined,
    };
    res = patchNextAppRouterLayout(ctx, effectiveOriginal, metadataEntries);
  } else {
    // React + Vite, CRA, or generic HTML
    res = patchReactViteHtml(ctx, effectiveOriginal, {
      title: metadata.title,
      description: metadata.description,
      favicon: metadata.favicon,
      canonical: metadata.canonical,
      openGraph: metadata.openGraph,
      twitter: metadata.twitter,
    });
  }

  const patchedContent = (res.status === "applied" && res.patchedContent) ? res.patchedContent : effectiveOriginal;
  const diffResult = generateUnifiedDiff(targetPath, effectiveOriginal, patchedContent);
  const diff = typeof diffResult === "object" ? diffResult.diff : diffResult;
  const originalHash = calculateFileHash(effectiveOriginal);
  const validation = validateCode({
    filePath: targetPath,
    originalContent: effectiveOriginal,
    proposedContent: patchedContent,
    framework: typeof framework === "string" ? { slug: framework } : framework,
    expectedHash: originalHash,
    currentRemoteContent: effectiveOriginal,
    action: "modify",
  });

  return {
    status: res.status,
    targetFile: targetPath,
    filePath: targetPath,
    originalContent: effectiveOriginal,
    proposedContent: patchedContent,
    originalHash,
    diff,
    changes: res.changes || [],
    placeholders: res.placeholders || [],
    validation,
    framework,
  };
}
