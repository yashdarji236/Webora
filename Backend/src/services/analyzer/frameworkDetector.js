/**
 * Framework Detection Engine
 * Accurately detects web frameworks, exact versions, languages, package managers, and monorepos.
 */

/**
 * Detect package manager based on repository files
 * @param {Array<{path: string}>} treeItems
 * @param {object} packageJson
 */
export function detectPackageManager(treeItems, packageJson = {}) {
  const filePaths = new Set(treeItems.map((item) => item.path.toLowerCase()));

  // Check packageManager field in package.json (Corepack standard)
  if (packageJson?.packageManager && typeof packageJson.packageManager === "string") {
    const pm = packageJson.packageManager.toLowerCase();
    if (pm.startsWith("pnpm")) return "pnpm";
    if (pm.startsWith("yarn")) return "yarn";
    if (pm.startsWith("bun")) return "bun";
    if (pm.startsWith("npm")) return "npm";
  }

  if (filePaths.has("pnpm-lock.yaml")) return "pnpm";
  if (filePaths.has("yarn.lock")) return "yarn";
  if (filePaths.has("bun.lockb") || filePaths.has("bun.lock")) return "bun";
  if (filePaths.has("package-lock.json")) return "npm";

  return "npm"; // Default
}

/**
 * Detect TypeScript vs JavaScript
 */
export function detectLanguage(treeItems, packageJson = {}) {
  const filePaths = treeItems.map((item) => item.path.toLowerCase());
  const hasTsConfig = filePaths.some((p) => p === "tsconfig.json" || p.endsWith("/tsconfig.json"));
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const hasTsDep = Boolean(deps.typescript);

  const hasTsFiles = filePaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));

  if (hasTsConfig || hasTsDep || hasTsFiles) {
    return "TypeScript";
  }
  return "JavaScript";
}

/**
 * Detect monorepo structure
 */
export function detectMonorepo(treeItems, packageJson = {}) {
  const filePaths = new Set(treeItems.map((item) => item.path.toLowerCase()));
  const isPnpmWorkspace = filePaths.has("pnpm-workspace.yaml");
  const isLerna = filePaths.has("lerna.json");
  const isTurbo = filePaths.has("turbo.json");
  const hasWorkspacesField = Boolean(packageJson?.workspaces);

  const packageJsonFiles = treeItems.filter(
    (item) => item.path.endsWith("package.json") && item.path !== "package.json"
  );

  const isMonorepo = isPnpmWorkspace || isLerna || isTurbo || hasWorkspacesField || packageJsonFiles.length > 0;

  return {
    isMonorepo,
    tool: isTurbo ? "Turborepo" : isPnpmWorkspace ? "pnpm workspaces" : isLerna ? "Lerna" : hasWorkspacesField ? "npm/yarn workspaces" : null,
    workspacePackages: packageJsonFiles.map((item) => item.path.replace("/package.json", "")),
  };
}

/**
 * Detect framework, version, and dependencies
 * @param {object} packageJson
 * @param {Array<{path: string}>} treeItems
 */
export function detectFramework(packageJson, treeItems = []) {
  if (!packageJson) {
    // Repository without package.json (could be static HTML, Astro static, or Python/Go backend)
    const filePaths = treeItems.map((item) => item.path.toLowerCase());
    if (filePaths.some((p) => p === "index.html")) {
      return {
        name: "Static HTML",
        slug: "static-html",
        version: null,
        language: "HTML",
        packageManager: "none",
        reactVersion: null,
        nodeRequirement: null,
        confidence: "medium",
      };
    }
    return {
      name: "Unknown / Non-Node",
      slug: "unknown",
      version: null,
      language: "Unknown",
      packageManager: "none",
      reactVersion: null,
      nodeRequirement: null,
      confidence: "low",
    };
  }

  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  const filePaths = new Set(treeItems.map((item) => item.path.toLowerCase()));
  const language = detectLanguage(treeItems, packageJson);
  const packageManager = detectPackageManager(treeItems, packageJson);
  const reactVersion = deps.react || deps["react-dom"] || null;
  const nodeRequirement = packageJson.engines?.node || null;

  // 1. Next.js (Must check before pure React)
  if (deps.next) {
    return {
      name: "Next.js",
      slug: "nextjs",
      version: cleanVersion(deps.next),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 2. Astro
  if (deps.astro || filePaths.has("astro.config.mjs") || filePaths.has("astro.config.ts")) {
    return {
      name: "Astro",
      slug: "astro",
      version: cleanVersion(deps.astro),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 3. Nuxt (Vue)
  if (deps.nuxt || deps.nuxt3 || filePaths.has("nuxt.config.ts") || filePaths.has("nuxt.config.js")) {
    return {
      name: "Nuxt",
      slug: "nuxt",
      version: cleanVersion(deps.nuxt || deps.nuxt3),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  // 4. SvelteKit & Svelte
  if (deps["@sveltejs/kit"] || filePaths.has("svelte.config.js")) {
    return {
      name: "SvelteKit",
      slug: "sveltekit",
      version: cleanVersion(deps["@sveltejs/kit"]),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }
  if (deps.svelte) {
    return {
      name: "Svelte",
      slug: "svelte",
      version: cleanVersion(deps.svelte),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  // 5. Remix / React Router Framework
  if (deps["@remix-run/react"] || deps["@remix-run/node"] || deps["@remix-run/dev"]) {
    return {
      name: "Remix",
      slug: "remix",
      version: cleanVersion(deps["@remix-run/react"] || deps["@remix-run/node"]),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 6. Gatsby
  if (deps.gatsby || filePaths.has("gatsby-config.js")) {
    return {
      name: "Gatsby",
      slug: "gatsby",
      version: cleanVersion(deps.gatsby),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 7. React + Vite
  const hasVite = deps.vite || filePaths.has("vite.config.ts") || filePaths.has("vite.config.js");
  if (deps.react && hasVite) {
    return {
      name: "React + Vite",
      slug: "react-vite",
      version: cleanVersion(deps.react),
      viteVersion: cleanVersion(deps.vite),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 8. Create React App
  if (deps["react-scripts"]) {
    return {
      name: "Create React App",
      slug: "create-react-app",
      version: cleanVersion(deps["react-scripts"]),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "high",
    };
  }

  // 9. React (Standalone / Custom build)
  if (deps.react) {
    return {
      name: "React",
      slug: "react",
      version: cleanVersion(deps.react),
      language,
      packageManager,
      reactVersion: cleanVersion(reactVersion),
      nodeRequirement,
      confidence: "medium",
    };
  }

  // 10. Vue (without Nuxt)
  if (deps.vue) {
    return {
      name: "Vue",
      slug: "vue",
      version: cleanVersion(deps.vue),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  // 11. Angular
  if (deps["@angular/core"] || filePaths.has("angular.json")) {
    return {
      name: "Angular",
      slug: "angular",
      version: cleanVersion(deps["@angular/core"]),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  // 12. NestJS
  if (deps["@nestjs/core"]) {
    return {
      name: "NestJS",
      slug: "nestjs",
      version: cleanVersion(deps["@nestjs/core"]),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  // 13. Express
  if (deps.express) {
    return {
      name: "Express",
      slug: "express",
      version: cleanVersion(deps.express),
      language,
      packageManager,
      reactVersion: null,
      nodeRequirement,
      confidence: "high",
    };
  }

  return {
    name: "Node.js Application",
    slug: "nodejs",
    version: packageJson.version || null,
    language,
    packageManager,
    reactVersion: null,
    nodeRequirement,
    confidence: "low",
  };
}

/**
 * Remove semver prefixes like ^, ~, >=
 */
function cleanVersion(ver) {
  if (!ver || typeof ver !== "string") return null;
  return ver.replace(/^[\^~>=< ]+/, "").trim();
}

