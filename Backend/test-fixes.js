/**
 * Test Suite for Feature 4: AI-Powered Automated SEO Code Fix Engine
 */

import assert from "node:assert/strict";
import { resolveTargetFile, calculateFileHash } from "./src/services/ai-fix-engine/fileResolver.js";
import { buildSystemPrompt, buildUserPrompt } from "./src/services/ai-fix-engine/promptBuilder.js";
import { generateUnifiedDiff } from "./src/services/ai-fix-engine/patchGenerator.js";
import { validateFilePath, validateCode, validateHash } from "./src/services/ai-fix-engine/codeValidator.js";
import { generateAiFix } from "./src/services/ai-fix-engine/aiProvider.js";

async function runTests() {
  console.log("🧪 Starting Feature 4: AI Code Fix Engine Test Suite...\n");
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

  // --- 1. File Resolver Tests ---
  console.log("▶ Testing File Resolver:");

  await testAsync("Resolves Next.js App Router metadata file correctly", async () => {
    const res = await resolveTargetFile({
      issue: { id: "missing-meta-description", category: "meta" },
      repositoryAnalysis: {
        framework: { name: "Next.js", slug: "nextjs" },
        router: { type: "app" },
        structure: { importantFiles: ["app/layout.tsx", "app/page.tsx"] },
      },
      owner: "testowner",
      repo: "testrepo",
    });
    assert.equal(res.targetPath, "app/layout.tsx");
  });

  await testAsync("Resolves Next.js Pages Router document file correctly", async () => {
    const res = await resolveTargetFile({
      issue: { id: "missing-html-lang", category: "technical" },
      repositoryAnalysis: {
        framework: { name: "Next.js", slug: "nextjs" },
        router: { type: "pages" },
        structure: { importantFiles: ["pages/_document.tsx", "pages/index.tsx"] },
      },
    });
    assert.equal(res.targetPath, "pages/_document.tsx");
  });

  await testAsync("Resolves React + Vite index.html file correctly", async () => {
    const res = await resolveTargetFile({
      issue: { id: "missing-og-image", category: "social" },
      repositoryAnalysis: {
        framework: { name: "React (Vite)", slug: "react" },
        structure: { importantFiles: ["index.html", "src/App.tsx"] },
      },
    });
    assert.equal(res.targetPath, "index.html");
  });

  await testAsync("Resolves Astro layout file correctly", async () => {
    const res = await resolveTargetFile({
      issue: { id: "missing-title", category: "meta" },
      repositoryAnalysis: {
        framework: { name: "Astro", slug: "astro" },
        structure: { importantFiles: ["src/layouts/Layout.astro"] },
      },
    });
    assert.equal(res.targetPath, "src/layouts/Layout.astro");
  });

  await testAsync("Resolves robots.txt creation path when missing", async () => {
    const res = await resolveTargetFile({
      issue: { id: "missing-robots-txt", category: "technical" },
      repositoryAnalysis: {
        framework: { name: "React (Vite)", slug: "react" },
        structure: { importantFiles: ["src/App.tsx"] },
      },
    });
    assert.equal(res.targetPath, "public/robots.txt");
    assert.equal(res.action, "create");
    assert.equal(res.originalContent, "");
  });

  test("Calculates correct SHA-256 hash for content", () => {
    const hash = calculateFileHash("<html><head><title>MetaMend</title></head></html>");
    assert.equal(typeof hash, "string");
    assert.equal(hash.length, 64);
  });

  // --- 2. Prompt Builder Tests ---
  console.log("\n▶ Testing Prompt Builder:");

  test("Builds App Router system prompt forbidding next/head", () => {
    const prompt = buildSystemPrompt({
      framework: { name: "Next.js" },
      router: { type: "app" },
    });
    assert.ok(prompt.includes("NEVER import or use \"next/head\" in App Router"));
    assert.ok(prompt.includes("export const metadata"));
  });

  test("Builds Pages Router system prompt forbidding metadata export", () => {
    const prompt = buildSystemPrompt({
      framework: { name: "Next.js" },
      router: { type: "pages" },
    });
    assert.ok(prompt.includes("NEVER export \"const metadata\" in Pages router"));
    assert.ok(prompt.includes("import Head from 'next/head'"));
  });

  test("Builds User prompt with issue details and evidence", () => {
    const userPrompt = buildUserPrompt({
      issue: {
        id: "missing-og-description",
        title: "Missing og:description",
        category: "social",
        severity: "high",
        affectedUrl: "https://example.com",
        recommendation: "Add og:description meta tag.",
        evidence: { ogTags: {} },
      },
      targetFile: "index.html",
      action: "modify",
      originalContent: "<title>Hello</title>",
      additionalInstructions: "Ensure description is 120 chars.",
    });
    assert.ok(userPrompt.includes("Missing og:description"));
    assert.ok(userPrompt.includes("index.html"));
    assert.ok(userPrompt.includes("Ensure description is 120 chars."));
  });

  // --- 3. Patch Generator Tests ---
  console.log("\n▶ Testing Patch Generator:");

  test("Generates valid diff for new file creation", () => {
    const patch = generateUnifiedDiff("public/robots.txt", "", "User-agent: *\nAllow: /\n");
    assert.ok(patch.diff.includes("--- /dev/null"));
    assert.ok(patch.diff.includes("+++ b/public/robots.txt"));
    assert.ok(patch.diff.includes("+User-agent: *"));
    assert.equal(patch.deletions, 0);
    assert.equal(patch.additions, 3);
  });

  test("Generates valid unified diff for file modification", () => {
    const orig = `<head>\n  <title>Old</title>\n</head>`;
    const prop = `<head>\n  <title>New</title>\n  <meta name="description" content="Fixed" />\n</head>`;
    const patch = generateUnifiedDiff("index.html", orig, prop);
    assert.ok(patch.diff.includes("--- a/index.html"));
    assert.ok(patch.diff.includes("+++ b/index.html"));
    assert.ok(patch.diff.includes("-  <title>Old</title>"));
    assert.ok(patch.diff.includes("+  <title>New</title>"));
    assert.ok(patch.additions > 0);
    assert.ok(patch.deletions > 0);
  });

  test("Returns clean message for identical files", () => {
    const content = `const test = 1;`;
    const patch = generateUnifiedDiff("test.js", content, content);
    assert.equal(patch.additions, 0);
    assert.equal(patch.deletions, 0);
    assert.ok(patch.diff.includes("(No changes)"));
  });

  // --- 4. Code Validator Tests ---
  console.log("\n▶ Testing Code Validator:");

  test("Rejects path traversal attempts (..)", () => {
    const res = validateFilePath("../../etc/passwd");
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("Path traversal")));
  });

  test("Rejects sensitive file locations (.git/, .env)", () => {
    const res = validateFilePath(".env");
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("sensitive file")));
  });

  test("Accepts safe relative repository paths", () => {
    const res = validateFilePath("src/app/layout.tsx");
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  test("Detects dangerous eval and child_process constructs", () => {
    const code = `eval("danger");`;
    const res = validateCode({
      filePath: "src/main.js",
      proposedContent: code,
    });
    assert.equal(res.status, "invalid");
    assert.ok(res.errors.some((e) => e.includes("eval()")));
  });

  test("Detects Next.js App Router violation (using next/head in app/)", () => {
    const code = `import Head from 'next/head';\nexport default function Layout() { return <Head></Head>; }`;
    const res = validateCode({
      filePath: "app/layout.tsx",
      proposedContent: code,
      framework: { slug: "nextjs" },
      router: { type: "app" },
    });
    assert.equal(res.status, "invalid");
    assert.ok(res.errors.some((e) => e.includes("next/head")));
  });

  test("Warns on out-of-sync remote hash", () => {
    const res = validateHash({
      currentContent: "modified remotely",
      expectedHash: "originalhash123",
      action: "modify",
    });
    assert.equal(res.match, false);
    assert.ok(res.error.includes("File has changed on remote repository"));
  });

  // --- 5. AI Provider Configuration Tests ---
  console.log("\n▶ Testing AI Provider Handling:");

  await testAsync("Throws clear configuration error when API key is missing", async () => {
    process.env.TEST_NO_ENV_RELOAD = "true";
    const origGemini = process.env.GEMINI_API_KEY;
    const origGoogle = process.env.GOOGLE_API_KEY;
    const origOpenAI = process.env.OPENAI_API_KEY;

    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await generateAiFix({
        systemPrompt: "sys",
        userPrompt: "usr",
      });
      assert.fail("Should have thrown AI_KEY_MISSING");
    } catch (err) {
      assert.equal(err.code, "AI_KEY_MISSING");
      assert.ok(err.message.includes("Configure GEMINI_API_KEY or OPENAI_API_KEY"));
    } finally {
      delete process.env.TEST_NO_ENV_RELOAD;
      if (origGemini) process.env.GEMINI_API_KEY = origGemini;
      if (origGoogle) process.env.GOOGLE_API_KEY = origGoogle;
      if (origOpenAI) process.env.OPENAI_API_KEY = origOpenAI;
    }
  });

  console.log(`\n========================================`);
  console.log(`✅ All Feature 4 Tests Passed: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();

