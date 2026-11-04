/**
 * Analyzer Engine Test Suite
 * Tests detection against various frameworks, routing architectures, and SEO states.
 */

import { detectFramework, detectMonorepo, detectLanguage, detectPackageManager } from "./src/services/analyzer/frameworkDetector.js";
import { detectRouter } from "./src/services/analyzer/routerDetector.js";
import { analyzeStructure } from "./src/services/analyzer/structureAnalyzer.js";
import { detectDeployment } from "./src/services/analyzer/deploymentDetector.js";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log("\n=================================");
console.log("RUNNING ANALYZER ENGINE TESTS");
console.log("=================================\n");

// 1. Next.js App Router
{
  const pkg = { dependencies: { next: "^15.1.0", react: "^19.0.0" } };
  const tree = [
    { path: "app/layout.tsx", type: "blob" },
    { path: "app/page.tsx", type: "blob" },
    { path: "package.json", type: "blob" },
    { path: "tsconfig.json", type: "blob" },
  ];
  const fw = detectFramework(pkg, tree);
  const router = detectRouter(fw.slug, tree, pkg);
  assert(fw.name === "Next.js" && fw.version === "15.1.0", "Next.js detection & clean version");
  assert(fw.language === "TypeScript", "TypeScript detection from tsconfig/files");
  assert(router.type === "app-router", "Next.js App Router detection");
}

// 2. Next.js Pages Router
{
  const pkg = { dependencies: { next: "14.2.5", react: "18.2.0" } };
  const tree = [
    { path: "pages/_app.tsx", type: "blob" },
    { path: "pages/index.tsx", type: "blob" },
    { path: "package.json", type: "blob" },
  ];
  const fw = detectFramework(pkg, tree);
  const router = detectRouter(fw.slug, tree, pkg);
  assert(fw.slug === "nextjs", "Next.js Pages detection");
  assert(router.type === "pages-router", "Pages Router detection");
}

// 3. React + Vite
{
  const pkg = { dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" }, devDependencies: { vite: "^5.4.0" } };
  const tree = [
    { path: "vite.config.ts", type: "blob" },
    { path: "index.html", type: "blob" },
    { path: "src/main.tsx", type: "blob" },
    { path: "package-lock.json", type: "blob" },
  ];
  const fw = detectFramework(pkg, tree);
  const router = detectRouter(fw.slug, tree, pkg);
  assert(fw.name === "React + Vite", "React + Vite detection");
  assert(fw.packageManager === "npm", "NPM package manager detected from package-lock.json");
  assert(router.type === "single-page", "React single-page router detection");
}

// 4. Astro
{
  const pkg = { dependencies: { astro: "^4.15.0" } };
  const tree = [
    { path: "astro.config.mjs", type: "blob" },
    { path: "src/pages/index.astro", type: "blob" },
    { path: "pnpm-lock.yaml", type: "blob" },
  ];
  const fw = detectFramework(pkg, tree);
  const router = detectRouter(fw.slug, tree, pkg);
  assert(fw.name === "Astro", "Astro detection");
  assert(fw.packageManager === "pnpm", "PNPM package manager detected from pnpm-lock.yaml");
  assert(router.type === "file-based", "Astro file-based router detection");
}

// 5. Nuxt (Vue)
{
  const pkg = { devDependencies: { nuxt: "^3.12.0" }, dependencies: { vue: "^3.4.0" } };
  const tree = [
    { path: "nuxt.config.ts", type: "blob" },
    { path: "pages/index.vue", type: "blob" },
  ];
  const fw = detectFramework(pkg, tree);
  const router = detectRouter(fw.slug, tree, pkg);
  assert(fw.name === "Nuxt", "Nuxt detection");
  assert(router.type === "file-based", "Nuxt file-based router detection");
}

// 6. Monorepo (Turborepo)
{
  const pkg = { workspaces: ["apps/*", "packages/*"] };
  const tree = [
    { path: "turbo.json", type: "blob" },
    { path: "apps/web/package.json", type: "blob" },
    { path: "packages/ui/package.json", type: "blob" },
  ];
  const mono = detectMonorepo(tree, pkg);
  assert(mono.isMonorepo === true, "Monorepo detection");
  assert(mono.tool === "Turborepo", "Turborepo tool detection");
  assert(mono.workspacePackages.length === 2, "Workspace packages detection");
}

// 7. Repository without package.json (Static HTML)
{
  const tree = [
    { path: "index.html", type: "blob" },
    { path: "css/style.css", type: "blob" },
  ];
  const fw = detectFramework(null, tree);
  assert(fw.name === "Static HTML", "Static HTML detection without package.json");
}

// 8. Deployment Detection
{
  const treeVercel = [{ path: "vercel.json", type: "blob" }];
  const deployVercel = detectDeployment(treeVercel, "https://portfolio.vercel.app");
  assert(deployVercel.platform === "Vercel", "Vercel deployment detection");
  assert(deployVercel.liveDeploymentVerified === true, "Vercel live deployment verified");

  const treeNetlify = [{ path: "netlify.toml", type: "blob" }];
  const deployNetlify = detectDeployment(treeNetlify, "");
  assert(deployNetlify.platform === "Netlify", "Netlify deployment detection");

  const treeDocker = [{ path: "Dockerfile", type: "blob" }];
  const deployDocker = detectDeployment(treeDocker, "");
  assert(deployDocker.platform === "Docker Container", "Docker container detection");
}

// 9. Structure Analyzer Visual Tree
{
  const tree = [
    { path: "app/layout.tsx", type: "blob", size: 500 },
    { path: "app/page.tsx", type: "blob", size: 1200 },
    { path: "public/favicon.ico", type: "blob", size: 3000 },
    { path: "next.config.ts", type: "blob", size: 150 },
    { path: "package.json", type: "blob", size: 800 },
  ];
  const structure = analyzeStructure(tree, "my-repo");
  assert(structure.visualTree.name === "my-repo", "Visual tree root naming");
  assert(structure.importantFiles.length >= 2, "Important config files identified");
  assert(structure.directories.includes("app"), "Directory identification");
}

console.log(`\nTests finished: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);

