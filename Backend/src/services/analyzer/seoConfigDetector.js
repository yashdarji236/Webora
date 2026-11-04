/**
 * SEO Configuration Detection Engine
 * Deeply inspects repository source code and configuration files to determine
 * exact SEO status (present, missing, partial, dynamic, unable-to-verify)
 * across Next.js, Vite/React, Astro, and other web frameworks.
 */

import { fetchFileContent } from "../github/fileContentService.js";

/**
 * Inspect SEO configurations in repository
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} accessToken
 * @param {object} framework - from frameworkDetector
 * @param {Array<{path: string}>} treeItems - from git tree
 */
export async function detectSeoConfiguration(owner, repo, branch, accessToken, framework, treeItems = []) {
  const pathSet = new Set(treeItems.map((item) => item.path.toLowerCase()));
  const allPaths = treeItems.map((item) => item.path);

  // Initialize all elements with default "missing"
  const seoResults = {
    title: { status: "missing", sources: [], details: "No page title tag or metadata export found." },
    description: { status: "missing", sources: [], details: "No meta description defined." },
    openGraph: { status: "missing", sources: [], details: "No OpenGraph tags (og:title, og:image, etc.) configured." },
    twitterCards: { status: "missing", sources: [], details: "No Twitter card tags configured." },
    canonical: { status: "missing", sources: [], details: "No canonical link element or canonical metadata configured." },
    robots: { status: "missing", sources: [], details: "No robots.txt or dynamic robots route detected." },
    sitemap: { status: "missing", sources: [], details: "No sitemap.xml or dynamic sitemap generator detected." },
    favicon: { status: "missing", sources: [], details: "No favicon or app icon declared." },
    structuredData: { status: "missing", sources: [], details: "No JSON-LD structured data detected." },
    language: { status: "missing", sources: [], details: "HTML lang attribute missing or unconfigured." },
    viewport: { status: "missing", sources: [], details: "Mobile viewport meta tag missing or unconfigured." },
  };

  // ─── 1. CHECK FILE-BASED STATIC ASSETS FIRST (Robots, Sitemap, Favicon) ───

  // Robots
  const robotsFiles = [
    "public/robots.txt",
    "robots.txt",
    "app/robots.ts",
    "app/robots.js",
    "src/app/robots.ts",
    "src/app/robots.js",
  ];
  for (const rf of robotsFiles) {
    if (pathSet.has(rf.toLowerCase())) {
      seoResults.robots = {
        status: rf.endsWith(".ts") || rf.endsWith(".js") ? "dynamic" : "present",
        sources: [rf],
        details: rf.endsWith(".ts") || rf.endsWith(".js") ? "Dynamic Next.js robots generator route" : "Static robots.txt file",
      };
      break;
    }
  }

  // Sitemap
  const sitemapFiles = [
    "public/sitemap.xml",
    "sitemap.xml",
    "app/sitemap.ts",
    "app/sitemap.js",
    "src/app/sitemap.ts",
    "src/app/sitemap.js",
    "public/sitemap-0.xml",
  ];
  for (const sf of sitemapFiles) {
    if (pathSet.has(sf.toLowerCase())) {
      seoResults.sitemap = {
        status: sf.endsWith(".ts") || sf.endsWith(".js") ? "dynamic" : "present",
        sources: [sf],
        details: sf.endsWith(".ts") || sf.endsWith(".js") ? "Dynamic Next.js sitemap generator" : "Static XML sitemap file",
      };
      break;
    }
  }

  // Favicon & App Icons
  const faviconCandidates = [
    "public/favicon.ico",
    "favicon.ico",
    "public/icon.svg",
    "public/icon.png",
    "app/favicon.ico",
    "src/app/favicon.ico",
    "src/favicon.ico",
    "public/apple-touch-icon.png",
  ];
  for (const fc of faviconCandidates) {
    if (pathSet.has(fc.toLowerCase())) {
      seoResults.favicon = {
        status: "present",
        sources: [fc],
        details: `Favicon icon found at ${fc}`,
      };
      break;
    }
  }

  // ─── 2. CANDIDATE SOURCE FILES INSPECTION ────────────────────────────────
  // Identify the most relevant metadata candidate files in the repo
  const candidateFilesToRead = [];

  // Index.html (Vite, React SPA, Static, Angular)
  const indexHtmlPaths = ["index.html", "public/index.html", "src/index.html"];
  for (const p of indexHtmlPaths) {
    if (pathSet.has(p.toLowerCase())) candidateFilesToRead.push(p);
  }

  // Next.js App Router root layout & page
  const nextLayoutPaths = [
    "app/layout.tsx",
    "app/layout.jsx",
    "app/layout.js",
    "src/app/layout.tsx",
    "src/app/layout.jsx",
    "src/app/layout.js",
    "app/page.tsx",
    "app/page.jsx",
    "src/app/page.tsx",
    "src/app/page.jsx",
    "app/metadata.ts",
    "src/app/metadata.ts",
  ];
  for (const p of nextLayoutPaths) {
    if (pathSet.has(p.toLowerCase())) candidateFilesToRead.push(p);
  }

  // Next.js Pages Router _document & _app
  const nextPagesPaths = [
    "pages/_document.tsx",
    "pages/_document.jsx",
    "pages/_document.js",
    "src/pages/_document.tsx",
    "src/pages/_document.js",
    "pages/_app.tsx",
    "pages/_app.jsx",
    "pages/index.tsx",
    "pages/index.jsx",
  ];
  for (const p of nextPagesPaths) {
    if (pathSet.has(p.toLowerCase())) candidateFilesToRead.push(p);
  }

  // Astro Layouts
  const astroFiles = allPaths.filter(
    (p) =>
      p.toLowerCase().startsWith("src/layouts/") ||
      p.toLowerCase() === "src/pages/index.astro"
  );
  candidateFilesToRead.push(...astroFiles.slice(0, 3));

  // React App entry/components for Helmet or Head
  const reactCandidates = ["src/App.tsx", "src/App.jsx", "src/main.tsx", "src/main.jsx"];
  for (const p of reactCandidates) {
    if (pathSet.has(p.toLowerCase())) candidateFilesToRead.push(p);
  }

  // Limit total candidate files to inspect to avoid excessive calls (up to 8 files)
  const filesToInspect = Array.from(new Set(candidateFilesToRead)).slice(0, 8);

  // Read each candidate file and inspect patterns
  for (const filePath of filesToInspect) {
    const content = await fetchFileContent(owner, repo, filePath, branch, accessToken);
    if (!content) continue;

    analyzeFileContent(filePath, content, seoResults);
  }

  return seoResults;
}

/**
 * Analyze code content for SEO patterns
 */
function analyzeFileContent(filePath, content, results) {
  const lower = content.toLowerCase();

  // 1. Title
  if (results.title.status !== "present") {
    if (/<title[^>]*>([^<]+)<\/title>/i.test(content)) {
      results.title = {
        status: "present",
        sources: [...results.title.sources, filePath],
        details: `HTML <title> tag found in ${filePath}`,
      };
    } else if (/\btitle\s*:\s*["'`][^"'`]+["'`]/i.test(content) || /\bexport\s+const\s+metadata\b[\s\S]*?\btitle\b/i.test(content)) {
      results.title = {
        status: "present",
        sources: [...results.title.sources, filePath],
        details: `Next.js/Astro metadata title export found in ${filePath}`,
      };
    } else if (/<Helmet[^>]*>[\s\S]*?<title>/i.test(content) || /generateMetadata/i.test(content)) {
      results.title = {
        status: "dynamic",
        sources: [...results.title.sources, filePath],
        details: `Dynamic title configuration (${filePath})`,
      };
    }
  }

  // 2. Meta Description
  if (results.description.status !== "present") {
    if (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.test(content) ||
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.test(content)) {
      results.description = {
        status: "present",
        sources: [...results.description.sources, filePath],
        details: `Standard meta description tag declared in ${filePath}`,
      };
    } else if (/\bdescription\s*:\s*["'`][^"'`]+["'`]/i.test(content) && (/metadata/i.test(content) || /head/i.test(content))) {
      results.description = {
        status: "present",
        sources: [...results.description.sources, filePath],
        details: `Framework metadata description found in ${filePath}`,
      };
    } else if (/description\s*:\s*(\w+|\(.*\)\s*=>)/i.test(content) || /generateMetadata/i.test(content)) {
      results.description = {
        status: "dynamic",
        sources: [...results.description.sources, filePath],
        details: `Dynamic description handler found in ${filePath}`,
      };
    }
  }

  // 3. OpenGraph
  if (results.openGraph.status !== "present") {
    const hasOgTitle = /og:title/i.test(content) || /openGraph\s*:\s*\{[^}]*title/i.test(content);
    const hasOgImage = /og:image/i.test(content) || /openGraph\s*:\s*\{[^}]*images?/i.test(content);
    const hasOgType = /og:type/i.test(content);

    if (hasOgTitle && hasOgImage) {
      results.openGraph = {
        status: "present",
        sources: [...results.openGraph.sources, filePath],
        details: `Complete OpenGraph metadata (og:title, og:image) declared in ${filePath}`,
      };
    } else if (hasOgTitle || hasOgImage || hasOgType || /openGraph/i.test(content)) {
      results.openGraph = {
        status: "partial",
        sources: [...results.openGraph.sources, filePath],
        details: `Partial OpenGraph configuration (missing title or image) in ${filePath}`,
      };
    }
  }

  // 4. Twitter Cards
  if (results.twitterCards.status !== "present") {
    const hasTwitterCard = /twitter:card/i.test(content) || /twitter\s*:\s*\{[^}]*card/i.test(content);
    const hasTwitterTitle = /twitter:title/i.test(content) || /twitter\s*:\s*\{[^}]*title/i.test(content);

    if (hasTwitterCard) {
      results.twitterCards = {
        status: "present",
        sources: [...results.twitterCards.sources, filePath],
        details: `Twitter Card configuration declared in ${filePath}`,
      };
    } else if (hasTwitterTitle || /twitter/i.test(content)) {
      results.twitterCards = {
        status: "partial",
        sources: [...results.twitterCards.sources, filePath],
        details: `Partial Twitter metadata found in ${filePath}`,
      };
    }
  }

  // 5. Canonical URL
  if (results.canonical.status !== "present") {
    if (/<link[^>]+rel=["']canonical["']/i.test(content) ||
        /\balternates\s*:\s*\{[^}]*canonical/i.test(content) ||
        /\bcanonical\s*:\s*["'`][^"'`]+["'`]/i.test(content)) {
      results.canonical = {
        status: "present",
        sources: [...results.canonical.sources, filePath],
        details: `Canonical link declared in ${filePath}`,
      };
    } else if (/canonical/i.test(content)) {
      results.canonical = {
        status: "partial",
        sources: [...results.canonical.sources, filePath],
        details: `Canonical reference found in ${filePath}`,
      };
    }
  }

  // 6. Structured Data (JSON-LD)
  if (results.structuredData.status !== "present") {
    if (/application\/ld\+json/i.test(content) || /schema\.org/i.test(content) || /jsonLd/i.test(content)) {
      results.structuredData = {
        status: "present",
        sources: [...results.structuredData.sources, filePath],
        details: `JSON-LD / Schema.org structured data detected in ${filePath}`,
      };
    }
  }

  // 7. Language
  if (results.language.status !== "present") {
    const langMatch = content.match(/<html[^>]+lang=["']([a-zA-Z-]+)["']/i);
    if (langMatch) {
      results.language = {
        status: "present",
        sources: [...results.language.sources, filePath],
        details: `HTML lang="${langMatch[1]}" declared in ${filePath}`,
      };
    }
  }

  // 8. Viewport
  if (results.viewport.status !== "present") {
    if (/<meta[^>]+name=["']viewport["']/i.test(content) || /viewport\s*:\s*\{/i.test(content) || /export\s+const\s+viewport/i.test(content)) {
      results.viewport = {
        status: "present",
        sources: [...results.viewport.sources, filePath],
        details: `Mobile viewport configuration found in ${filePath}`,
      };
    }
  }

  // 9. Favicon tag inside HTML
  if (results.favicon.status !== "present") {
    if (/<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(content) || /icons\s*:\s*\{[^}]*icon/i.test(content)) {
      results.favicon = {
        status: "present",
        sources: [...results.favicon.sources, filePath],
        details: `Favicon link declared in ${filePath}`,
      };
    }
  }
}

