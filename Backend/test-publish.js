/**
 * Test Suite for Feature 5: SEO Bootstrap + One-Click Pull Request
 */

import assert from "node:assert/strict";
import {
  detectSeoState,
  generateBootstrapFixes,
  combineBootstrapWithTargetedFixes,
} from "./src/services/ai-fix-engine/rule-engine/bootstrap.js";
import {
  buildPrTitle,
  buildPrBody,
  buildCommitMessage,
} from "./src/services/github/publish/prBodyBuilder.js";
import { publishFixes } from "./src/services/github/publish/publishService.js";
import SeoFix from "./src/models/seoFix.model.js";
import SeoPublish from "./src/models/seoPublish.model.js";
import SeoAudit from "./src/models/seoAudit.model.js";
import RepositoryAnalysis from "./src/models/repositoryAnalysis.model.js";

async function runTests() {
  console.log("🧪 Starting Feature 5: SEO Bootstrap & PR Publisher Test Suite...\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
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

  // ─────────────────────────────────────────────────────────────
  // 1. BOOTSTRAP DETECTION TESTS
  // ─────────────────────────────────────────────────────────────
  console.log("▶ 1. Bootstrap Detection (detectSeoState):");

  await test("Detects 'none' when repository has no SEO tags or files", () => {
    const analysis = { framework: { slug: "nextjs-app", name: "Next.js" }, router: { type: "app" } };
    const audit = {
      issues: [
        { id: "missing-title" },
        { id: "missing-meta-description" },
        { id: "missing-og-image" },
        { id: "missing-robots-txt" },
        { id: "missing-sitemap-xml" },
        { id: "missing-html-lang" },
      ],
      metadata: {},
    };
    const tree = ["app/layout.tsx", "package.json"];
    const contents = { "app/layout.tsx": "export default function Root({children}) { return <html><body>{children}</body></html>; }" };

    const state = detectSeoState(analysis, audit, tree, contents);
    assert.equal(state.level, "none");
    assert.ok(state.missing.includes("title"));
    assert.ok(state.missing.includes("metaDescription"));
    assert.ok(state.missing.includes("robots"));
    assert.ok(state.missing.includes("sitemap"));
  });

  await test("Detects 'partial' when some tags exist and some are missing", () => {
    const analysis = { framework: { slug: "react-vite", name: "React" } };
    const audit = {
      issues: [
        { id: "missing-meta-description" },
        { id: "missing-robots-txt" },
      ],
      metadata: { title: "My Awesome React App" },
    };
    const tree = ["index.html", "src/App.tsx"];
    const contents = { "index.html": "<html lang='en'><head><title>My Awesome React App</title></head></html>" };

    const state = detectSeoState(analysis, audit, tree, contents);
    assert.equal(state.level, "partial");
    assert.ok(state.present.includes("title"));
    assert.ok(state.missing.includes("metaDescription"));
    assert.ok(state.missing.includes("robots"));
  });

  await test("Detects 'good' when all core SEO elements exist", () => {
    const analysis = { framework: { slug: "nextjs-app", name: "Next.js" } };
    const audit = {
      issues: [],
      metadata: {
        title: "Complete Site",
        description: "Full description",
        openGraph: { title: "Complete Site", image: "https://example.com/og.png" },
        jsonLd: [{ "@type": "WebSite" }],
      },
      crawl: { robots: { found: true }, sitemap: { found: true } },
    };
    const tree = ["app/layout.tsx", "app/robots.ts", "app/sitemap.ts"];
    const contents = { "app/layout.tsx": "export const metadata = { title: 'Complete Site', description: 'Full' };" };

    const state = detectSeoState(analysis, audit, tree, contents);
    assert.equal(state.level, "good");
    assert.equal(state.missing.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. BOOTSTRAP PLAN GENERATION PER FRAMEWORK
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 2. Bootstrap Generation per Framework:");

  await test("Next.js App Router: creates robots.ts, sitemap.ts, JsonLd.tsx, patches layout.tsx", async () => {
    const analysis = {
      framework: { slug: "nextjs-app", name: "Next.js", version: "14.2.0" },
      router: { type: "app" },
      structure: { importantFiles: ["app/layout.tsx"] },
    };
    const audit = {
      audit: { overallScore: 42, grade: "F" },
      metadata: { title: "MetaMend App" },
    };

    const fixes = await generateBootstrapFixes({
      repoAnalysis: analysis,
      audit,
      fileTree: ["app/layout.tsx", "package.json"],
      fileFetcher: async (p) => (p === "app/layout.tsx" ? "export default function Layout({children}) { return <html><body>{children}</body></html>; }" : null),
    });

    assert.ok(fixes.length >= 4);

    const layoutFix = fixes.find((f) => f.patch.filePath === "app/layout.tsx");
    assert.ok(layoutFix);
    assert.equal(layoutFix.operation, "modify");
    assert.ok(layoutFix.patch.proposedContent.includes("export const metadata"));
    assert.ok(layoutFix.patch.proposedContent.includes("export const viewport"));

    const robotsFix = fixes.find((f) => f.patch.filePath === "app/robots.ts");
    assert.ok(robotsFix);
    assert.equal(robotsFix.operation, "create");
    assert.ok(robotsFix.patch.proposedContent.includes("MetadataRoute.Robots"));

    const sitemapFix = fixes.find((f) => f.patch.filePath === "app/sitemap.ts");
    assert.ok(sitemapFix);
    assert.equal(sitemapFix.operation, "create");
    assert.ok(sitemapFix.patch.proposedContent.includes("MetadataRoute.Sitemap"));

    const jsonLdFix = fixes.find((f) => f.patch.filePath === "components/JsonLd.tsx");
    assert.ok(jsonLdFix);
    assert.equal(jsonLdFix.operation, "create");
  });

  await test("React + Vite: creates public/robots.txt, public/sitemap.xml, patches index.html", async () => {
    const analysis = { framework: { slug: "react-vite", name: "React" } };
    const audit = {
      metadata: { title: "Vite React App", description: "Awesome app" },
      crawl: { visitedUrls: ["/", "/about", "/pricing"] },
    };

    const fixes = await generateBootstrapFixes({
      repoAnalysis: analysis,
      audit,
      fileTree: ["index.html"],
      fileFetcher: async (p) => (p === "index.html" ? "<!doctype html><html><head><title>Vite App</title></head><body><div id='root'></div></body></html>" : null),
    });

    const indexFix = fixes.find((f) => f.patch.filePath === "index.html");
    assert.ok(indexFix);
    assert.equal(indexFix.operation, "modify");
    assert.ok(indexFix.patch.proposedContent.includes("name=\"description\""));

    const robotsFix = fixes.find((f) => f.patch.filePath === "public/robots.txt");
    assert.ok(robotsFix);
    assert.equal(robotsFix.operation, "create");
    assert.ok(robotsFix.patch.proposedContent.includes("User-agent: *"));

    const sitemapFix = fixes.find((f) => f.patch.filePath === "public/sitemap.xml");
    assert.ok(sitemapFix);
    assert.equal(sitemapFix.operation, "create");
    assert.ok(sitemapFix.patch.proposedContent.includes("/about"));
    assert.ok(sitemapFix.patch.proposedContent.includes("/pricing"));
  });

  await test("Create vs Modify: switches operation to 'modify' if file already exists remotely", async () => {
    const analysis = { framework: { slug: "nextjs-app", name: "Next.js" }, router: { type: "app" } };
    const fixes = await generateBootstrapFixes({
      repoAnalysis: analysis,
      fileTree: ["app/layout.tsx", "app/robots.ts"],
      fileFetcher: async (p) => {
        if (p === "app/robots.ts") return "export default function robots() { return {}; }";
        if (p === "app/layout.tsx") return "export default function Layout({children}) { return <html><body>{children}</body></html>; }";
        return null;
      },
    });

    const robotsFix = fixes.find((f) => f.patch.filePath === "app/robots.ts");
    assert.ok(robotsFix);
    assert.equal(robotsFix.operation, "modify");
  });

  await test("Remix & Nuxt: return manual status with framework snippets", async () => {
    const remixFixes = await generateBootstrapFixes({
      repoAnalysis: { framework: { slug: "remix", name: "Remix" } },
    });
    assert.equal(remixFixes[0].status, "manual");
    assert.ok(remixFixes[0].manualSnippet.includes("MetaFunction"));

    const nuxtFixes = await generateBootstrapFixes({
      repoAnalysis: { framework: { slug: "nuxt", name: "Nuxt" } },
    });
    assert.equal(nuxtFixes[0].status, "manual");
    assert.ok(nuxtFixes[0].manualSnippet.includes("useSeoMeta"));
  });

  await test("Deduplication: combineBootstrapWithTargetedFixes merges fixes per file", () => {
    const targeted = [
      {
        patch: { filePath: "app/layout.tsx" },
        issueId: "missing-meta-description",
        ruleIds: ["metaDescription"],
      },
    ];
    const bootstrap = [
      {
        patch: { filePath: "app/layout.tsx" },
        issueId: "bootstrap-next-app-layout",
        ruleIds: ["title", "openGraph"],
        isBootstrap: true,
      },
      {
        patch: { filePath: "app/robots.ts" },
        issueId: "bootstrap-next-app-robots",
        ruleIds: ["robots"],
        isBootstrap: true,
      },
    ];

    const combined = combineBootstrapWithTargetedFixes(bootstrap, targeted);
    assert.equal(combined.length, 2);

    const layoutFix = combined.find((f) => f.patch.filePath === "app/layout.tsx");
    assert.ok(layoutFix.ruleIds.includes("metaDescription"));
    assert.ok(layoutFix.ruleIds.includes("title"));
    assert.ok(layoutFix.ruleIds.includes("openGraph"));
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PR BODY & COMMIT MESSAGE BUILDER
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 3. PR Content & Commit Message Generation:");

  await test("Generates deterministic PR title with fix count", () => {
    assert.equal(buildPrTitle([{ id: 1 }, { id: 2 }]), "SEO: fix 2 issues with MetaMend");
    assert.equal(buildPrTitle([{ id: 1 }]), "SEO: fix 1 issue with MetaMend");
  });

  await test("Generates commit message listing applied rules", () => {
    const msg = buildCommitMessage([
      { ruleIds: ["title", "metaDescription"] },
      { ruleIds: ["robots"] },
    ]);
    assert.ok(msg.startsWith("chore(seo): add/fix SEO metadata via MetaMend"));
    assert.ok(msg.includes("title"));
    assert.ok(msg.includes("metaDescription"));
    assert.ok(msg.includes("robots"));
  });

  await test("Generates complete PR body with score, table, and verification checklist", () => {
    const body = buildPrBody({
      fixes: [
        {
          patch: { filePath: "app/layout.tsx", action: "modify" },
          operation: "modify",
          ruleIds: ["title", "metaDescription"],
          confidence: "high",
          changes: [{ description: "Added root metadata object.", reason: "Enables search crawling." }],
        },
        {
          patch: { filePath: "app/robots.ts", action: "create" },
          operation: "create",
          ruleIds: ["robots"],
          confidence: "high",
          changes: [{ description: "Generated robots.ts.", reason: "Directs bots to sitemap." }],
        },
      ],
      audit: { audit: { overallScore: 48, grade: "D" } },
      repoAnalysis: { framework: { name: "Next.js" } },
    });

    assert.ok(body.includes("SEO score before:"));
    assert.ok(body.includes("48/100"));
    assert.ok(body.includes("| `app/layout.tsx` | **MODIFY** |"));
    assert.ok(body.includes("| `app/robots.ts` | **CREATE** |"));
    assert.ok(body.includes("### 🔍 What Changed and Why"));
    assert.ok(body.includes("### ✅ Verification Steps"));
    assert.ok(body.includes("Nothing was auto-merged."));
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PUBLISH SERVICE (MOCKED GITHUB API)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 4. GitHub Publisher Service (Pre-flight & Git Data API):");

  function createMockGitHub(initialData = {}) {
    const calls = [];
    const files = new Map(Object.entries(initialData.files || {}));
    const branches = new Map([["main", "sha-commit-base"], ...(initialData.branches || [])]);
    let openPrs = initialData.openPrs || [];

    const mockFetch = async (url, options = {}) => {
      const urlStr = url.toString();
      const method = (options.method || "GET").toUpperCase();
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ method, url: urlStr, body });

      // GET /repos/:owner/:repo
      if (urlStr.match(/\/repos\/[^/]+\/[^/]+$/) && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            default_branch: "main",
            permissions: { push: initialData.canPush !== false },
            archived: Boolean(initialData.archived),
            disabled: Boolean(initialData.disabled),
          }),
        };
      }

      // GET /repos/:owner/:repo/contents/:path?ref=main
      if (urlStr.includes("/contents/") && method === "GET") {
        const match = urlStr.match(/\/contents\/([^?]+)/);
        const filePath = decodeURIComponent(match[1]);
        if (files.has(filePath)) {
          const content = files.get(filePath);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              type: "file",
              encoding: "utf-8",
              content,
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: "Not Found" }) };
      }

      // GET /git/ref/heads/main
      if (urlStr.includes("/git/ref/heads/main") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ object: { sha: "sha-commit-base" } }),
        };
      }

      // GET /git/commits/sha-commit-base
      if (urlStr.includes("/git/commits/sha-commit-base") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ tree: { sha: "sha-tree-base" } }),
        };
      }

      // POST /git/blobs
      if (urlStr.includes("/git/blobs") && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: `blob-sha-${Math.random().toString(36).slice(2, 7)}` }),
        };
      }

      // POST /git/trees
      if (urlStr.includes("/git/trees") && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: "sha-tree-new" }),
        };
      }

      // POST /git/commits
      if (urlStr.includes("/git/commits") && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: "sha-commit-new" }),
        };
      }

      // GET /git/ref/heads/:branch (check branch collision)
      if (urlStr.match(/\/git\/ref\/heads\/([^/]+)$/) && method === "GET") {
        const branch = decodeURIComponent(urlStr.split("/").pop());
        if (branches.has(branch)) {
          return { ok: true, status: 200, json: async () => ({ object: { sha: branches.get(branch) } }) };
        }
        return { ok: false, status: 404, json: async () => ({ message: "Not Found" }) };
      }

      // POST /git/refs (create branch)
      if (urlStr.includes("/git/refs") && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({ ref: body.ref, object: { sha: body.sha } }),
        };
      }

      // PATCH /git/refs/heads/:branch (update branch)
      if (urlStr.includes("/git/refs/heads/") && method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ref: urlStr, object: { sha: body.sha } }),
        };
      }

      // GET /pulls?state=open
      if (urlStr.includes("/pulls") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => openPrs,
        };
      }

      // POST /pulls (create PR)
      if (urlStr.includes("/pulls") && method === "POST") {
        const pr = {
          number: 42,
          html_url: "https://github.com/org/repo/pull/42",
          title: body.title,
          head: { ref: body.head },
        };
        openPrs.push(pr);
        return {
          ok: true,
          status: 201,
          json: async () => pr,
        };
      }

      // POST /labels
      if (urlStr.includes("/labels") && method === "POST") {
        return { ok: true, status: 200, json: async () => body.labels };
      }

      // Branch protection: GET /branches/:branch/protection
      if (urlStr.includes("/protection") && method === "GET") {
        if (initialData.branchProtection) {
          return { ok: true, status: 200, json: async () => initialData.branchProtection };
        }
        return { ok: false, status: 404, json: async () => ({ message: "Branch not protected" }) };
      }

      // POST /forks
      if (urlStr.includes("/forks") && method === "POST") {
        return { ok: true, status: 202, json: async () => ({ full_name: "testuser/repo" }) };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    };

    return { mockFetch, calls };
  }

  // Setup mock Mongoose Find/Create
  const fakeUser = {
    _id: "user-123",
    username: "testuser",
    accessToken: "gho_secret_token_abc_xyz",
  };

  const fakeFixes = [
    {
      _id: "fix-1",
      repoFullName: "testorg/testrepo",
      status: "approved",
      operation: "modify",
      patch: {
        filePath: "app/layout.tsx",
        action: "modify",
        originalContent: "export default function Layout() {}",
        proposedContent: "export const metadata = {}; export default function Layout() {}",
        originalHash: "429aad3bc9fbfdf66d56f0a827f13d83cbbc3a552e3476773b0c5ad5b282d51a",
      },
      save: async () => {},
    },
    {
      _id: "fix-2",
      repoFullName: "testorg/testrepo",
      status: "approved",
      operation: "create",
      patch: {
        filePath: "app/robots.ts",
        action: "create",
        originalContent: "",
        proposedContent: "export default function robots() { return {}; }",
        originalHash: "",
      },
      save: async () => {},
    },
  ];

  // Mock SeoFix.find & updateMany
  SeoFix.find = async (q) => fakeFixes;
  SeoFix.updateMany = async () => ({ modifiedCount: 2 });
  SeoPublish.create = async (doc) => ({ _id: "pub-123", ...doc });
  SeoAudit.findOne = () => ({ sort: () => null });
  RepositoryAnalysis.findOne = () => ({ sort: () => null });

  await test("Mode A (PR): Creates 1 commit for all files and opens 1 Pull Request", async () => {
    const { mockFetch, calls } = createMockGitHub({
      files: {
        "app/layout.tsx": "export default function Layout() {}",
      },
    });

    const res = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "pr",
      fetchFn: mockFetch,
    });

    assert.equal(res.success, true);
    assert.equal(res.mode, "pr");
    assert.equal(res.prNumber, 42);
    assert.ok(res.prUrl.includes("/pull/42"));
    assert.equal(res.publishedCount, 2);

    // Verify exactly 1 commit was created
    const commitCalls = calls.filter((c) => c.method === "POST" && c.url.includes("/git/commits"));
    assert.equal(commitCalls.length, 1);

    // Verify no force flag was sent
    const patchCalls = calls.filter((c) => c.method === "PATCH");
    for (const p of patchCalls) {
      assert.equal(p.body?.force, false);
    }
  });

  await test("Branch name collision: appends counter to branch name", async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const collidingBranch = `metamend/seo-fixes-${today}-abc`;

    const { mockFetch, calls } = createMockGitHub({
      files: { "app/layout.tsx": "export default function Layout() {}" },
      branches: [[collidingBranch, "sha-old"]],
    });

    // Mock randomBytes to force collision
    const res = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "pr",
      fetchFn: mockFetch,
    });

    assert.equal(res.success, true);
    assert.ok(res.branch.startsWith("metamend/seo-fixes-"));
  });

  await test("Drift detection: marks fix as stale when GitHub file differs from originalHash", async () => {
    const driftedFix = {
      _id: "fix-drift",
      repoFullName: "testorg/testrepo",
      status: "approved",
      operation: "modify",
      patch: {
        filePath: "app/layout.tsx",
        action: "modify",
        originalContent: "old code",
        proposedContent: "new code",
        originalHash: "hash-of-old-code",
      },
      save: async function () { this.saved = true; },
    };

    SeoFix.find = async () => [driftedFix];

    const { mockFetch } = createMockGitHub({
      files: {
        "app/layout.tsx": "different remote code pushed recently",
      },
    });

    const res = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "pr",
      fetchFn: mockFetch,
    });

    assert.equal(res.success, false);
    assert.equal(res.code, "ALL_FIXES_STALE");
    assert.equal(driftedFix.status, "stale");
    assert.equal(driftedFix.saved, true);
  });

  await test("Placeholder guard: blocks publish if proposed content contains TODO and allowPlaceholders is false", async () => {
    const todoFix = {
      _id: "fix-todo",
      repoFullName: "testorg/testrepo",
      status: "approved",
      operation: "modify",
      patch: {
        filePath: "app/layout.tsx",
        action: "modify",
        originalContent: "console.log(1);",
        proposedContent: "export const metadata = { title: '[TODO: Add your brand title]' };",
        originalHash: "hash",
      },
      save: async () => {},
    };

    SeoFix.find = async () => [todoFix];
    const { mockFetch } = createMockGitHub();

    await assert.rejects(
      async () => {
        await publishFixes({
          user: fakeUser,
          repo: "testorg/testrepo",
          mode: "pr",
          options: { allowPlaceholders: false },
          fetchFn: mockFetch,
        });
      },
      /unresolved TODO placeholders/
    );
  });

  await test("No push permission: triggers fork flow with cross-repo PR", async () => {
    SeoFix.find = async () => fakeFixes;

    const { mockFetch, calls } = createMockGitHub({
      canPush: false,
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    const res = await publishFixes({
      user: fakeUser,
      repo: "upstreamorg/upstreamrepo",
      mode: "pr",
      fetchFn: mockFetch,
    });

    assert.equal(res.success, true);
    assert.equal(res.usedFork, true);
    assert.equal(res.forkOwner, "testuser");

    const forkCall = calls.find((c) => c.method === "POST" && c.url.includes("/forks"));
    assert.ok(forkCall);

    const prCall = calls.find((c) => c.method === "POST" && c.url.includes("/pulls"));
    assert.ok(prCall.body.head.includes("testuser:"));
  });

  await test("Existing open PR returns 409, or updates branch when updateExistingPr is true", async () => {
    SeoFix.find = async () => fakeFixes;

    const { mockFetch: fetch409 } = createMockGitHub({
      openPrs: [
        {
          number: 101,
          html_url: "https://github.com/org/repo/pull/101",
          head: { ref: "metamend/seo-fixes-existing" },
        },
      ],
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    const res409 = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "pr",
      options: { updateExistingPr: false },
      fetchFn: fetch409,
    });

    assert.equal(res409.success, false);
    assert.equal(res409.code, "EXISTING_PR_OPEN");
    assert.equal(res409.existingPr.number, 101);

    // Now test with updateExistingPr: true
    const { mockFetch: fetchUpdate, calls: updateCalls } = createMockGitHub({
      openPrs: [
        {
          number: 101,
          html_url: "https://github.com/org/repo/pull/101",
          head: { ref: "metamend/seo-fixes-existing" },
        },
      ],
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    const resUpdate = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "pr",
      options: { updateExistingPr: true },
      fetchFn: fetchUpdate,
    });

    assert.equal(resUpdate.success, true);
    assert.equal(resUpdate.prNumber, 101);

    const patchRef = updateCalls.find((c) => c.method === "PATCH" && decodeURIComponent(c.url).includes("metamend/seo-fixes-existing"));
    assert.ok(patchRef);
  });

  await test("Mode B (Direct): refuses without confirmDirect, wrong confirmRepoName, or protection", async () => {
    SeoFix.find = async () => fakeFixes;
    const { mockFetch } = createMockGitHub({
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    // 1. Missing confirmDirect
    await assert.rejects(
      async () => {
        await publishFixes({
          user: fakeUser,
          repo: "testorg/testrepo",
          mode: "direct",
          options: { confirmDirect: false },
          fetchFn: mockFetch,
        });
      },
      /confirmDirect: true/
    );

    // 2. Wrong confirmRepoName
    await assert.rejects(
      async () => {
        await publishFixes({
          user: fakeUser,
          repo: "testorg/testrepo",
          mode: "direct",
          options: { confirmDirect: true, confirmRepoName: "wrong-repo" },
          fetchFn: mockFetch,
        });
      },
      /Confirmation mismatch/
    );

    // 3. Branch protection requiring reviews
    const { mockFetch: fetchProtected } = createMockGitHub({
      branchProtection: { required_pull_request_reviews: { required_approving_review_count: 1 } },
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    await assert.rejects(
      async () => {
        await publishFixes({
          user: fakeUser,
          repo: "testorg/testrepo",
          mode: "direct",
          options: { confirmDirect: true, confirmRepoName: "testrepo" },
          fetchFn: fetchProtected,
        });
      },
      /branch protection rules/
    );
  });

  await test("Mode B (Direct): succeeds when all guards pass, updates default branch with force: false", async () => {
    SeoFix.find = async () => fakeFixes;
    const { mockFetch, calls } = createMockGitHub({
      files: { "app/layout.tsx": "export default function Layout() {}" },
    });

    const res = await publishFixes({
      user: fakeUser,
      repo: "testorg/testrepo",
      mode: "direct",
      options: { confirmDirect: true, confirmRepoName: "testrepo" },
      fetchFn: mockFetch,
    });

    assert.equal(res.success, true);
    assert.equal(res.mode, "direct");
    assert.equal(res.branch, "main");
    assert.ok(res.revertHint.includes("git revert"));

    const patchCall = calls.find((c) => c.method === "PATCH" && c.url.includes("/git/refs/heads/main"));
    assert.ok(patchCall);
    assert.equal(patchCall.body.force, false);
  });

  await test("Security: Token never appears in responses or error messages", async () => {
    const leakingFetch = async () => {
      throw new Error(`Failed request to https://api.github.com with token ${fakeUser.accessToken}`);
    };

    try {
      await publishFixes({
        user: fakeUser,
        repo: "testorg/testrepo",
        fetchFn: leakingFetch,
      });
      assert.fail("Should have thrown error");
    } catch (err) {
      assert.ok(!err.message.includes(fakeUser.accessToken));
      assert.ok(err.message.includes("[REDACTED]"));
    }
  });

  console.log("\n========================================");
  console.log(`✅ All Feature 5 Tests Passed: ${passed} passed, ${failed} failed.`);
  console.log("========================================\n");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
