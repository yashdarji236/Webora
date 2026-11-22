import crypto from "node:crypto";
import { fetchFileContent } from "../github/fileContentService.js";

/**
 * Calculates SHA-256 hash of file content.
 */
export function calculateFileHash(content) {
  if (content === null || content === undefined) return "";
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Resolves the primary target file path and retrieves its original content from GitHub.
 *
 * @param {Object} options
 * @param {Object} options.issue - The SEO issue object
 * @param {Object} options.repositoryAnalysis - Analysis containing framework, router, importantFiles
 * @param {string} options.owner - GitHub repository owner
 * @param {string} options.repo - GitHub repository name
 * @param {string} [options.branch='main'] - Git branch name
 * @param {string} [options.accessToken] - User's GitHub access token
 * @returns {Promise<Object>} { targetPath, action: 'modify' | 'create', originalContent, originalHash }
 */
export async function resolveTargetFile({
  issue,
  repositoryAnalysis,
  owner,
  repo,
  branch = "main",
  accessToken,
}) {
  const frameworkSlug = (repositoryAnalysis?.framework?.slug || repositoryAnalysis?.framework?.name || "").toLowerCase();
  const routerType = (repositoryAnalysis?.router?.type || "").toLowerCase();
  const importantFiles = (repositoryAnalysis?.structure?.importantFiles || []).map((f) =>
    typeof f === "string" ? f : f?.path || ""
  );

  const issueId = (issue?.id || "").toLowerCase();
  const issueCategory = (issue?.category || "").toLowerCase();
  const isRobots = issueId.includes("robots") || issueCategory.includes("robots");
  const isSitemap = issueId.includes("sitemap") || issueCategory.includes("sitemap");
  const isStructuredData = issueId.includes("schema") || issueId.includes("structured_data") || issueCategory.includes("structured");

  let candidatePaths = [];

  if (frameworkSlug.includes("next")) {
    const isAppRouter = routerType.includes("app") || importantFiles.some((f) => f.includes("app/layout"));

    if (isRobots) {
      candidatePaths = isAppRouter
        ? ["app/robots.ts", "app/robots.js", "src/app/robots.ts", "public/robots.txt"]
        : ["public/robots.txt"];
    } else if (isSitemap) {
      candidatePaths = isAppRouter
        ? ["app/sitemap.ts", "app/sitemap.js", "src/app/sitemap.ts", "public/sitemap.xml"]
        : ["public/sitemap.xml"];
    } else if (isAppRouter) {
      candidatePaths = [
        "app/layout.tsx",
        "app/layout.js",
        "src/app/layout.tsx",
        "src/app/layout.js",
        "app/page.tsx",
        "app/page.js",
        "src/app/page.tsx",
      ];
    } else {
      // Pages router
      candidatePaths = [
        "pages/_document.tsx",
        "pages/_document.js",
        "src/pages/_document.tsx",
        "pages/_app.tsx",
        "pages/_app.js",
        "pages/index.tsx",
        "pages/index.js",
      ];
    }
  } else if (frameworkSlug.includes("astro")) {
    if (isRobots) {
      candidatePaths = ["public/robots.txt"];
    } else if (isSitemap) {
      candidatePaths = ["public/sitemap.xml", "astro.config.mjs"];
    } else {
      candidatePaths = [
        "src/layouts/Layout.astro",
        "src/layouts/BaseLayout.astro",
        "src/pages/index.astro",
      ];
    }
  } else if (frameworkSlug.includes("remix")) {
    if (isRobots) candidatePaths = ["public/robots.txt"];
    else if (isSitemap) candidatePaths = ["public/sitemap.xml"];
    else candidatePaths = ["app/root.tsx", "app/root.jsx", "app/routes/_index.tsx"];
  } else {
    // React + Vite, CRA, or generic HTML/SPA
    if (isRobots) {
      candidatePaths = ["public/robots.txt"];
    } else if (isSitemap) {
      candidatePaths = ["public/sitemap.xml"];
    } else {
      candidatePaths = [
        "index.html",
        "src/App.tsx",
        "src/App.jsx",
        "src/main.tsx",
        "src/main.jsx",
      ];
    }
  }

  // Prioritize candidates that exist in repository's known importantFiles
  let targetPath = null;
  let originalContent = null;

  for (const candidate of candidatePaths) {
    if (importantFiles.includes(candidate)) {
      targetPath = candidate;
      break;
    }
  }

  // If not matched directly in importantFiles list, attempt to fetch candidates in order
  if (owner && repo) {
    for (const candidate of candidatePaths) {
      const content = await fetchFileContent(owner, repo, candidate, branch, accessToken);
      if (content !== null) {
        targetPath = candidate;
        originalContent = content;
        break;
      }
    }
  }

  // If file still not found, check if this is a file creation scenario (e.g. robots.txt, sitemap, or primary layout)
  if (!targetPath) {
    targetPath = candidatePaths[0] || "index.html";
    return {
      targetPath,
      action: "create",
      originalContent: "",
      originalHash: "",
      exists: false,
    };
  }

  // If targetPath was found from importantFiles but content was not fetched yet
  if (originalContent === null && owner && repo) {
    originalContent = await fetchFileContent(owner, repo, targetPath, branch, accessToken);
  }

  const exists = originalContent !== null && originalContent !== undefined;
  const content = originalContent || "";
  const hash = exists ? calculateFileHash(content) : "";

  return {
    targetPath,
    action: exists ? "modify" : "create",
    originalContent: content,
    originalHash: hash,
    exists,
  };
}

