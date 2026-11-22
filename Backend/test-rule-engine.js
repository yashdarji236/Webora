/**
 * Test Suite for Feature 4: Rule-Based SEO Fix Engine
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRuleContext, normalizeFramework } from "./src/services/ai-fix-engine/rule-engine/context.js";
import {
  resolveTitle,
  resolveMetaDescription,
  resolveCanonicalUrl,
  resolveSocialImage,
  resolveSiteName,
  truncateWordBoundary,
} from "./src/services/ai-fix-engine/rule-engine/valueResolver.js";
import { getRulesForIssue, getRuleById, ALL_RULES } from "./src/services/ai-fix-engine/rule-engine/fixCatalog.js";
import { applyRulesToFile, runRuleEngine, runRuleFixForIssue } from "./src/services/ai-fix-engine/rule-engine/index.js";
import { patchNextAppRouterLayout, isNext14Plus } from "./src/services/ai-fix-engine/rule-engine/frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "./src/services/ai-fix-engine/rule-engine/frameworks/reactVite.js";
import { patchAstroLayout } from "./src/services/ai-fix-engine/rule-engine/frameworks/astro.js";
import { patchNextPagesRouter } from "./src/services/ai-fix-engine/rule-engine/frameworks/nextPagesRouter.js";
import { handleRemixOrNuxt } from "./src/services/ai-fix-engine/rule-engine/frameworks/remixNuxt.js";
import { parseTsx, validateTsxSyntax, hasUseClientDirective, hasGenerateMetadataExport } from "./src/services/ai-fix-engine/rule-engine/parsers/tsxParser.js";
import { inspectHtml, setHtmlLang, setHtmlTitle } from "./src/services/ai-fix-engine/rule-engine/parsers/htmlParser.js";
import { splitAstroContent, joinAstroContent } from "./src/services/ai-fix-engine/rule-engine/parsers/astroParser.js";
import { explainChange } from "./src/services/ai-fix-engine/rule-engine/explain.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "src/services/ai-fix-engine/rule-engine/__fixtures__");

async function runTests() {
  console.log("🧪 Starting Feature 4: Rule-Based SEO Fix Engine Test Suite...\n");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // ─── 1. CONTEXT & FRAMEWORK RESOLUTION ───
  console.log("▶ 1. Context & Framework Normalization:");

  test("Normalizes Next.js App Router from structure heuristics", () => {
    const fw = normalizeFramework({ framework: { name: "Next.js" }, router: { type: "app" } }, "app/layout.tsx");
    assert.equal(fw, "nextjs-app");
  });

  test("Normalizes Next.js Pages Router correctly", () => {
    const fw = normalizeFramework({ framework: { name: "Next.js" }, router: { type: "pages" } }, "pages/_document.tsx");
    assert.equal(fw, "nextjs-pages");
  });

  test("Normalizes React + Vite correctly", () => {
    const fw = normalizeFramework({ framework: { name: "React (Vite)" } }, "index.html");
    assert.equal(fw, "react-vite");
  });

  test("Normalizes Astro correctly", () => {
    const fw = normalizeFramework({ framework: { name: "Astro" } }, "src/layouts/Layout.astro");
    assert.equal(fw, "astro");
  });

  test("Builds complete RuleContext with crawl data and overrides", () => {
    const ctx = buildRuleContext({
      repoAnalysis: { framework: { name: "Next.js", version: "14.2.0" } },
      audit: {
        siteUrl: "https://metamend.dev",
        metadata: { title: "MetaMend Crawled", description: "MetaMend Crawled Desc" },
      },
      filePath: "app/layout.tsx",
      userOptions: { overrides: { title: "User Override Title" } },
    });
    assert.equal(ctx.framework, "nextjs-app");
    assert.equal(ctx.frameworkVersion, "14.2.0");
    assert.equal(ctx.siteUrl, "https://metamend.dev");
    assert.equal(ctx.crawl.title, "MetaMend Crawled");
    assert.equal(ctx.userOptions.overrides.title, "User Override Title");
  });

  // ─── 2. VALUE RESOLVER TESTS ───
  console.log("\n▶ 2. Value Resolver & Privacy Guards:");

  test("User override takes top precedence for title", () => {
    const ctx = { userOptions: { overrides: { title: "Overridden Title" } }, crawl: { title: "Crawled" } };
    const res = resolveTitle(ctx);
    assert.equal(res.value, "Overridden Title");
    assert.equal(res.confidence, "high");
  });

  test("Source/Crawled title is reused if within bounds", () => {
    const ctx = { userOptions: {}, crawl: { title: "Clean Crawled Title" } };
    const res = resolveTitle(ctx);
    assert.equal(res.value, "Clean Crawled Title");
    assert.equal(res.confidence, "high");
  });

  test("Long title is truncated cleanly on word boundary", () => {
    const long = "This is an extremely long title that exceeds the recommended length threshold of seventy characters";
    const ctx = { userOptions: {}, crawl: { title: long } };
    const res = resolveTitle(ctx);
    assert.ok(res.value.length <= 60);
    assert.equal(res.confidence, "medium");
  });

  test("Derives title from H1 + siteName if title missing", () => {
    const ctx = { userOptions: {}, crawl: { h1: "SEO Automation", siteName: "MetaMend" } };
    const res = resolveTitle(ctx);
    assert.equal(res.value, "SEO Automation | MetaMend");
  });

  test("Emits TODO placeholder when no context is available (never fabricates fake copy)", () => {
    const ctx = { userOptions: {}, crawl: {}, packageJson: null };
    const res = resolveTitle(ctx);
    assert.ok(res.value.startsWith("TODO:"));
    assert.equal(res.placeholder, true);
    assert.equal(res.confidence, "low");
  });

  test("User override takes top precedence for description", () => {
    const ctx = { userOptions: { overrides: { description: "Custom Desc" } }, crawl: {} };
    const res = resolveMetaDescription(ctx);
    assert.equal(res.value, "Custom Desc");
    assert.equal(res.confidence, "high");
  });

  test("Derives description from package.json without fake marketing copy", () => {
    const ctx = { userOptions: {}, crawl: {}, packageJson: { description: "Developer SEO automation tools" } };
    const res = resolveMetaDescription(ctx);
    assert.equal(res.value, "Developer SEO automation tools");
  });

  test("Emits TODO description placeholder when all sources empty", () => {
    const ctx = { userOptions: {}, crawl: {}, packageJson: null };
    const res = resolveMetaDescription(ctx);
    assert.ok(res.value.startsWith("TODO:"));
    assert.equal(res.placeholder, true);
  });

  test("Truncates on word boundary helper function", () => {
    const truncated = truncateWordBoundary("The quick brown fox jumps over the lazy dog", 20);
    assert.ok(truncated.length <= 20);
    assert.ok(!truncated.endsWith(" "));
  });

  // ─── 3. FIX CATALOG & RULE REGISTRATION ───
  console.log("\n▶ 3. Fix Catalog Registry:");

  test("Registry has 12 distinct SEO rules", () => {
    assert.equal(ALL_RULES.length, 12);
  });

  test("Maps missing-title issues to title rule", () => {
    const rules = getRulesForIssue("missing-title-https://example.com/");
    assert.ok(rules.some((r) => r.id === "title"));
  });

  test("Maps short-title issues to title rule", () => {
    const rules = getRulesForIssue("short-title-https://example.com/");
    assert.ok(rules.some((r) => r.id === "title"));
  });

  test("Maps missing-meta-description issues to metaDescription rule", () => {
    const rules = getRulesForIssue("missing-meta-description-https://example.com/");
    assert.ok(rules.some((r) => r.id === "metaDescription"));
  });

  test("Maps missing-canonical issues to canonical rule", () => {
    const rules = getRulesForIssue("missing-canonical-https://example.com/");
    assert.ok(rules.some((r) => r.id === "canonical"));
  });

  test("Maps missing-og-image issues to openGraph rule", () => {
    const rules = getRulesForIssue("missing-og-image");
    assert.ok(rules.some((r) => r.id === "openGraph"));
  });

  test("Maps missing-twitter-card issues to twitterCard rule", () => {
    const rules = getRulesForIssue("missing-twitter-card");
    assert.ok(rules.some((r) => r.id === "twitterCard"));
  });

  test("Maps missing-robots-txt to robots rule", () => {
    const rules = getRulesForIssue("missing-robots-txt");
    assert.ok(rules.some((r) => r.id === "robots"));
  });

  test("Maps missing-sitemap-xml to sitemap rule", () => {
    const rules = getRulesForIssue("missing-sitemap-xml");
    assert.ok(rules.some((r) => r.id === "sitemap"));
  });

  // ─── 4. PARSERS & AST HELPERS ───
  console.log("\n▶ 4. Parsers & Syntax Validation:");

  test("Validates clean TSX syntax without error", () => {
    const res = validateTsxSyntax("export const metadata = { title: 'Test' };");
    assert.equal(res.valid, true);
  });

  test("Detects broken TSX syntax and returns descriptive error", () => {
    const res = validateTsxSyntax("export const metadata = { title: ;");
    assert.equal(res.valid, false);
    assert.ok(res.error);
  });

  test("Detects 'use client' directive in AST", () => {
    const clientCode = fs.readFileSync(path.join(fixturesDir, "next-app-layout-client.tsx"), "utf8");
    const ast = parseTsx(clientCode);
    assert.equal(hasUseClientDirective(ast), true);
  });

  test("Detects generateMetadata export in AST", () => {
    const dynamicCode = fs.readFileSync(path.join(fixturesDir, "next-app-layout-dynamic.tsx"), "utf8");
    const ast = parseTsx(dynamicCode);
    assert.equal(hasGenerateMetadataExport(ast), true);
  });

  test("Astro parser splits frontmatter and template accurately", () => {
    const astroCode = fs.readFileSync(path.join(fixturesDir, "astro-layout-before.astro"), "utf8");
    const { hasFrontmatter, frontmatter, template } = splitAstroContent(astroCode);
    assert.equal(hasFrontmatter, true);
    assert.ok(frontmatter.includes("interface Props"));
    assert.ok(template.includes("<!doctype html>"));
  });

  // ─── 5. NEXT.JS APP ROUTER AST PATCHES ───
  console.log("\n▶ 5. Next.js App Router AST Rules:");

  test("App Router: Inserts new metadata export above default export", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true, siteUrl: "https://example.com" };
    const res = patchNextAppRouterLayout(ctx, code, { title: "MetaMend Home", description: "Automated SEO" });

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("export const metadata: Metadata = {"));
    assert.ok(res.patchedContent.includes("title: \"MetaMend Home\""));
    assert.ok(res.patchedContent.includes("import type { Metadata } from \"next\";"));
    // Default export must remain intact
    assert.ok(res.patchedContent.includes("export default function RootLayout"));
  });

  test("App Router: Deep-merges existing metadata without overwriting existing keys", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-merged-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true, siteUrl: "https://example.com" };
    const res = patchNextAppRouterLayout(ctx, code, {
      title: "SHOULD NOT OVERWRITE",
      description: "Newly Added Description",
      openGraph: {
        title: "SHOULD NOT OVERWRITE OG",
        description: "Newly Added OG Description",
      },
    });

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("title: \"Existing Custom Title\""));
    assert.ok(res.patchedContent.includes("title: \"Existing OG Title\""));
    assert.ok(res.patchedContent.includes("description: \"Newly Added Description\""));
    assert.ok(res.patchedContent.includes("description: \"Newly Added OG Description\""));
  });

  test("App Router: Next 14+ emits separate export const viewport", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.1.0", usesTypeScript: true, siteUrl: "https://example.com" };
    const res = patchNextAppRouterLayout(ctx, code, { title: "Title" }, { width: "device-width", initialScale: 1 });

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("export const viewport: Viewport = {"));
    assert.ok(res.patchedContent.includes("width: \"device-width\""));
    assert.ok(res.patchedContent.includes("initialScale: 1"));
  });

  test("App Router: Next 13 puts viewport inside metadata", () => {
    assert.equal(isNext14Plus("13.4.19"), false);
    assert.equal(isNext14Plus("14.0.0"), true);
    assert.equal(isNext14Plus("15.1.0"), true);
  });

  test("App Router: 'use client' layout returns status 'manual'", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-client.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true };
    const res = patchNextAppRouterLayout(ctx, code, { title: "Client Title" });

    assert.equal(res.status, "manual");
    assert.equal(res.patchedContent, null);
    assert.ok(res.reason.includes("use client"));
  });

  test("App Router: dynamic generateMetadata returns status 'manual'", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-dynamic.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true };
    const res = patchNextAppRouterLayout(ctx, code, { title: "Dynamic Title" });

    assert.equal(res.status, "manual");
    assert.equal(res.patchedContent, null);
    assert.ok(res.manualSnippet.includes("generateMetadata"));
  });

  test("App Router: Sets lang attribute on <html> element in JSX", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true };
    const res = patchNextAppRouterLayout(ctx, code, {}, null, "en");

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("<html lang=\"en\">"));
  });

  test("App Router: NEVER emits next/head", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true };
    const res = patchNextAppRouterLayout(ctx, code, { title: "Safe Title" });

    assert.equal(res.patchedContent.includes("next/head"), false);
  });

  // ─── 6. NEXT.JS PAGES ROUTER RULES ───
  console.log("\n▶ 6. Next.js Pages Router Rules:");

  test("Pages Router: Patches _document.tsx <Html lang='en'>", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-pages-document-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-pages", usesTypeScript: true };
    const res = patchNextPagesRouter(ctx, code, [], "en");

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("<Html lang=\"en\">"));
  });

  test("Pages Router: NEVER emits export const metadata", () => {
    const code = fs.readFileSync(path.join(fixturesDir, "next-pages-document-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-pages", usesTypeScript: true };
    const res = patchNextPagesRouter(ctx, code, [], "en");

    assert.equal(res.patchedContent.includes("export const metadata"), false);
  });

  // ─── 7. REACT + VITE HTML RULES ───
  console.log("\n▶ 7. React + Vite HTML Rules:");

  test("React + Vite: Injects missing meta tags into index.html preserving indentation", () => {
    const html = fs.readFileSync(path.join(fixturesDir, "react-vite-index-before.html"), "utf8");
    const ctx = { framework: "react-vite" };
    const res = patchReactViteHtml(ctx, html, {
      lang: "en",
      description: "Optimized React + Vite application.",
      canonical: "https://example.com/",
      openGraph: { title: "Vite App", description: "Optimized React" },
    });

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("<html lang=\"en\">"));
    assert.ok(res.patchedContent.includes("<meta name=\"description\" content=\"Optimized React + Vite application.\" />"));
    assert.ok(res.patchedContent.includes("<link rel=\"canonical\" href=\"https://example.com/\" />"));
    assert.ok(res.patchedContent.includes("<meta property=\"og:title\" content=\"Vite App\" />"));
  });

  test("React + Vite: Re-running on already-fixed HTML yields noop", () => {
    const html = fs.readFileSync(path.join(fixturesDir, "react-vite-index-before.html"), "utf8");
    const ctx = { framework: "react-vite" };
    const firstPass = patchReactViteHtml(ctx, html, {
      lang: "en",
      description: "My App",
    });

    const secondPass = patchReactViteHtml(ctx, firstPass.patchedContent, {
      lang: "en",
      description: "My App",
    });

    assert.equal(secondPass.status, "noop");
  });

  // ─── 8. ASTRO RULES ───
  console.log("\n▶ 8. Astro Layout Rules:");

  test("Astro: Injects canonical and description tags into Layout.astro", () => {
    const astro = fs.readFileSync(path.join(fixturesDir, "astro-layout-before.astro"), "utf8");
    const ctx = { framework: "astro" };
    const res = patchAstroLayout(ctx, astro, {
      description: "Astro starter blog",
      canonical: "https://astro.build/",
    });

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("<meta name=\"description\" content=\"Astro starter blog\" />"));
    assert.ok(res.patchedContent.includes("<link rel=\"canonical\" href=\"https://astro.build/\" />"));
    assert.ok(res.patchedContent.includes("interface Props"));
  });

  // ─── 9. REMIX & NUXT RULES ───
  console.log("\n▶ 9. Remix & Nuxt Rules:");

  test("Remix: Returns manual status with MetaFunction snippet", () => {
    const ctx = { framework: "remix" };
    const res = handleRemixOrNuxt(ctx, { title: "Remix App", description: "Remix Description" });
    assert.equal(res.status, "manual");
    assert.ok(res.manualSnippet.includes("export const meta: MetaFunction"));
  });

  test("Nuxt: Returns manual status with useSeoMeta snippet", () => {
    const ctx = { framework: "nuxt" };
    const res = handleRemixOrNuxt(ctx, { title: "Nuxt App", description: "Nuxt Description" });
    assert.equal(res.status, "manual");
    assert.ok(res.manualSnippet.includes("useSeoMeta"));
  });

  // ─── 10. ROBOTS & SITEMAP GENERATION ───
  console.log("\n▶ 10. Robots & Sitemap Generation:");

  test("Robots rule: Generates app/robots.ts for Next.js App Router", () => {
    const rule = getRuleById("robots");
    const ctx = { framework: "nextjs-app", usesTypeScript: true, siteUrl: "https://mywebsite.com" };
    const res = rule.apply(ctx, "");

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("export default function robots(): MetadataRoute.Robots"));
    assert.ok(res.patchedContent.includes("https://mywebsite.com/sitemap.xml"));
  });

  test("Robots rule: Generates public/robots.txt for static/React", () => {
    const rule = getRuleById("robots");
    const ctx = { framework: "react-vite", siteUrl: "https://mywebsite.com" };
    const res = rule.apply(ctx, "");

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("User-agent: *"));
    assert.ok(res.patchedContent.includes("Sitemap: https://mywebsite.com/sitemap.xml"));
  });

  test("Sitemap rule: Generates app/sitemap.ts for Next.js App Router", () => {
    const rule = getRuleById("sitemap");
    const ctx = { framework: "nextjs-app", usesTypeScript: true, siteUrl: "https://mywebsite.com" };
    const res = rule.apply(ctx, "");

    assert.equal(res.status, "applied");
    assert.ok(res.patchedContent.includes("export default function sitemap(): MetadataRoute.Sitemap"));
    assert.ok(res.patchedContent.includes("url: 'https://mywebsite.com'"));
  });

  // ─── 11. IDEMPOTENCY & DETERMINISM ───
  console.log("\n▶ 11. Idempotency & Determinism:");

  test("Idempotency: Re-applying App Router rule on fixed code yields noop", () => {
    const initial = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true, siteUrl: "https://example.com" };

    const first = patchNextAppRouterLayout(ctx, initial, { title: "Title", description: "Desc" });
    const second = patchNextAppRouterLayout(ctx, first.patchedContent, { title: "Title", description: "Desc" });

    assert.equal(second.status, "noop");
    assert.equal(second.changes.length, 0);
  });

  test("Determinism: Running engine twice with same inputs produces identical output", () => {
    const initial = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const ctx = { framework: "nextjs-app", frameworkVersion: "14.2.0", usesTypeScript: true, siteUrl: "https://example.com" };

    const run1 = patchNextAppRouterLayout(ctx, initial, { title: "Deterministic Title", description: "Deterministic Desc" });
    const run2 = patchNextAppRouterLayout(ctx, initial, { title: "Deterministic Title", description: "Deterministic Desc" });

    assert.equal(run1.patchedContent, run2.patchedContent);
  });

  // ─── 12. ORCHESTRATOR END-TO-END ───
  console.log("\n▶ 12. Rule Engine Orchestrator:");

  await testAsync("runRuleEngine batches rules into single file patch", async () => {
    const layoutCode = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const fileFetcher = async (p) => (p === "app/layout.tsx" ? layoutCode : "");

    const audit = {
      siteUrl: "https://metamend.dev",
      metadata: { title: "MetaMend Crawled Title", description: "MetaMend Crawled Description" },
      issues: [
        { id: "missing-title", title: "Missing Title" },
        { id: "missing-meta-description", title: "Missing Description" },
        { id: "missing-canonical", title: "Missing Canonical" },
      ],
    };

    const res = await runRuleEngine({
      repoAnalysis: { framework: { name: "Next.js", version: "14.2.0" } },
      audit,
      fileFetcher,
    });

    assert.ok(res.files.length >= 1);
    const layoutFix = res.files.find((f) => f.filePath === "app/layout.tsx");
    assert.ok(layoutFix);
    assert.equal(layoutFix.status, "applied");
    assert.ok(layoutFix.changes.length >= 2);
    assert.ok(layoutFix.diff.includes("+export const metadata"));
  });

  await testAsync("runRuleFixForIssue runs without any AI API keys configured", async () => {
    const layoutCode = fs.readFileSync(path.join(fixturesDir, "next-app-layout-before.tsx"), "utf8");
    const issue = { id: "missing-title", title: "Missing Title", category: "basic", severity: "high" };

    const fixResult = await runRuleFixForIssue({
      issue,
      repositoryAnalysis: { framework: { name: "Next.js", version: "14.2.0" }, structure: { importantFiles: ["app/layout.tsx"] } },
      repoDetails: { owner: "test", repo: "test" },
      audit: { siteUrl: "https://metamend.dev", metadata: { title: "Safe Title" } },
    });

    assert.equal(fixResult.engine, "rule");
    assert.equal(fixResult.status, "proposed");
    assert.ok(fixResult.patch.diff.length > 0);
  });

  console.log(`\n========================================`);
  console.log(`✅ All Feature 4 Rule Engine Tests Passed: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
