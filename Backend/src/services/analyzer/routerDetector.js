/**
 * Router Detection Engine
 * Determines routing architecture (Next.js App Router, Pages Router, React Router, file-based, etc.)
 */

export function detectRouter(frameworkSlug, treeItems = [], packageJson = {}) {
  const paths = treeItems.map((item) => item.path.toLowerCase());
  const pathSet = new Set(paths);
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

  // 1. Next.js Routing
  if (frameworkSlug === "nextjs") {
    const hasAppRouter = paths.some((p) => p.startsWith("app/") || p.startsWith("src/app/"));
    const hasPagesRouter = paths.some((p) => p.startsWith("pages/") || p.startsWith("src/pages/"));

    if (hasAppRouter && hasPagesRouter) {
      return {
        type: "hybrid",
        framework: "nextjs",
        confidence: "high",
        details: "Hybrid architecture (both App Router and Pages Router present).",
      };
    }

    if (hasAppRouter) {
      return {
        type: "app-router",
        framework: "nextjs",
        confidence: "high",
        details: "App Router convention (app/ directory).",
      };
    }

    if (hasPagesRouter) {
      return {
        type: "pages-router",
        framework: "nextjs",
        confidence: "high",
        details: "Pages Router convention (pages/ directory).",
      };
    }

    return {
      type: "unknown",
      framework: "nextjs",
      confidence: "low",
      details: "Next.js installed but neither app/ nor pages/ directories were located.",
    };
  }

  // 2. Astro
  if (frameworkSlug === "astro") {
    const hasAstroPages = paths.some((p) => p.startsWith("src/pages/"));
    return {
      type: "file-based",
      framework: "astro",
      confidence: hasAstroPages ? "high" : "medium",
      details: hasAstroPages ? "Astro file-based routing in src/pages/" : "Standard Astro routing",
    };
  }

  // 3. Remix
  if (frameworkSlug === "remix") {
    const hasRemixRoutes = paths.some((p) => p.startsWith("app/routes/"));
    return {
      type: "nested-routes",
      framework: "remix",
      confidence: hasRemixRoutes ? "high" : "medium",
      details: "Remix file-based nested routing in app/routes/",
    };
  }

  // 4. Nuxt
  if (frameworkSlug === "nuxt") {
    const hasNuxtPages = paths.some((p) => p.startsWith("pages/"));
    return {
      type: "file-based",
      framework: "nuxt",
      confidence: "high",
      details: hasNuxtPages ? "Nuxt pages/ router enabled" : "Single-page mode (app.vue)",
    };
  }

  // 5. SvelteKit
  if (frameworkSlug === "sveltekit") {
    const hasSvelteRoutes = paths.some((p) => p.startsWith("src/routes/"));
    return {
      type: "file-based",
      framework: "sveltekit",
      confidence: "high",
      details: hasSvelteRoutes ? "SvelteKit file-based routing in src/routes/" : "Standard SvelteKit routing",
    };
  }

  // 6. React / React + Vite / CRA
  if (frameworkSlug === "react-vite" || frameworkSlug === "react" || frameworkSlug === "create-react-app") {
    const hasReactRouter = Boolean(deps["react-router-dom"] || deps["react-router"]);
    const hasTanstackRouter = Boolean(deps["@tanstack/react-router"]);

    if (hasReactRouter) {
      const version = deps["react-router-dom"] || deps["react-router"];
      return {
        type: "react-router",
        framework: "react",
        confidence: "high",
        details: `React Router (${version}) declarative routing`,
      };
    }

    if (hasTanstackRouter) {
      return {
        type: "tanstack-router",
        framework: "react",
        confidence: "high",
        details: "TanStack Router type-safe routing",
      };
    }

    // Check if single page
    const hasIndexHtml = pathSet.has("index.html") || pathSet.has("public/index.html");
    return {
      type: "single-page",
      framework: "react",
      confidence: "medium",
      details: hasIndexHtml ? "Single-page application (SPA) without external router" : "React component library or SPA",
    };
  }

  // Fallback
  return {
    type: "unknown",
    framework: frameworkSlug || "unknown",
    confidence: "low",
    details: "Custom or non-standard routing architecture",
  };
}

