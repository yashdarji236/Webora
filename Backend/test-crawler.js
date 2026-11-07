/**
 * Feature 2 Test Suite
 * Tests SSRF validation, URL normalization, HTML parsing, issue generation, and deterministic scoring.
 */

import { isPrivateOrReservedIP, validateUrlSafety } from "./src/services/crawler/urlValidator.js";
import { normalizeUrl, resolveUrl, isSameDomain } from "./src/services/crawler/urlNormalizer.js";
import { parseHtml } from "./src/services/crawler/htmlParser.js";
import { calculateSeoScore } from "./src/services/seo-audit/seoScoringEngine.js";
import { analyzeBasicSeo } from "./src/services/seo-audit/basicSeoAnalyzer.js";
import { analyzeTechnicalSeo } from "./src/services/seo-audit/technicalSeoAnalyzer.js";
import { analyzeSocialSeo } from "./src/services/seo-audit/socialSeoAnalyzer.js";

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

async function runTests() {
  console.log("\n=================================");
  console.log("RUNNING FEATURE 2 AUDIT & CRAWLER TESTS");
  console.log("=================================\n");

  // 1. SSRF & Private IP Protection
  assert(isPrivateOrReservedIP("127.0.0.1"), "Blocks 127.0.0.1 (Loopback)");
  assert(isPrivateOrReservedIP("10.0.1.5"), "Blocks 10.0.0.0/8 (Private)");
  assert(isPrivateOrReservedIP("172.20.0.1"), "Blocks 172.16.0.0/12 (Private)");
  assert(isPrivateOrReservedIP("192.168.1.100"), "Blocks 192.168.0.0/16 (Private)");
  assert(isPrivateOrReservedIP("169.254.169.254"), "Blocks AWS metadata 169.254.169.254");
  assert(isPrivateOrReservedIP("::1"), "Blocks IPv6 loopback");
  assert(!isPrivateOrReservedIP("8.8.8.8"), "Allows public IP 8.8.8.8");
  assert(!isPrivateOrReservedIP("142.250.190.46"), "Allows public Google IP");

  // 2. URL Safety Validation
  const localCheck = await validateUrlSafety("http://localhost:3000");
  assert(!localCheck.valid, "Rejects localhost");

  const metaCheck = await validateUrlSafety("http://169.254.169.254/latest/meta-data/");
  assert(!metaCheck.valid, "Rejects cloud metadata endpoint");

  const ftpCheck = await validateUrlSafety("ftp://example.com/file");
  assert(!ftpCheck.valid, "Rejects non-HTTP(S) protocols");

  const validCheck = await validateUrlSafety("https://github.com/facebook/react");
  assert(validCheck.valid, "Accepts valid public HTTPS URL");

  // 3. URL Normalization
  const norm1 = normalizeUrl("https://example.com/about/?utm_source=twitter&utm_medium=social&fbclid=123");
  assert(norm1 === "https://example.com/about", "Strips UTM and tracking query params");

  const resolved = resolveUrl("/features", "https://example.com/blog/article");
  assert(resolved === "https://example.com/features", "Resolves root-relative path");

  assert(isSameDomain("https://example.com/pricing", "https://example.com"), "Matches same domain");
  assert(!isSameDomain("https://malicious.com", "https://example.com"), "Rejects cross-domain");

  // 4. Cheerio HTML Parsing
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>MetaMend — Automated SEO Platform</title>
      <meta name="description" content="Your SEO score, fixed in one pull request. Crawl and audit live repos.">
      <link rel="canonical" href="https://metamend.dev">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta property="og:title" content="MetaMend — Automated SEO Platform">
      <meta property="og:description" content="Your SEO score, fixed in one pull request.">
      <meta property="og:image" content="https://metamend.dev/og.png">
      <meta name="twitter:card" content="summary_large_image">
      <script type="application/ld+json">
        { "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "MetaMend" }
      </script>
    </head>
    <body>
      <h1>Automated SEO for Developers</h1>
      <h2>How it works</h2>
      <img src="/logo.png" alt="MetaMend Logo" width="200" height="50">
      <img src="/banner.png">
      <a href="/pricing">Pricing</a>
      <p>MetaMend inspects your deployed website and creates pull requests automatically to fix your SEO score.</p>
    </body>
    </html>
  `;

  const parsed = parseHtml(sampleHtml, "https://metamend.dev");
  assert(parsed.title === "MetaMend — Automated SEO Platform", "Extracted title");
  assert(parsed.metaDescription.startsWith("Your SEO score"), "Extracted meta description");
  assert(parsed.canonical === "https://metamend.dev", "Extracted canonical");
  assert(parsed.openGraph.image === "https://metamend.dev/og.png", "Extracted og:image");
  assert(parsed.twitter.card === "summary_large_image", "Extracted twitter:card");
  assert(parsed.headings.h1Count === 1, "Extracted single H1");
  assert(parsed.images.missingAlt === 1, "Detected missing image alt on banner.png");
  assert(parsed.structuredData.hasJsonLd, "Detected valid JSON-LD");

  // 5. Scoring Engine
  const mockIssues = [
    { category: "Basic SEO", severity: "critical", autoFixable: true },
    { category: "Basic SEO", severity: "medium", autoFixable: true },
    { category: "Technical SEO", severity: "high", autoFixable: true },
    { category: "Social Metadata", severity: "high", autoFixable: true },
    { category: "Content SEO", severity: "low", autoFixable: true },
  ];

  const scoreResult = calculateSeoScore(mockIssues);
  assert(scoreResult.overallScore < 100 && scoreResult.overallScore > 50, "Calculated score within range");
  assert(scoreResult.counts.critical === 1, "Counts critical issues correctly");
  assert(scoreResult.counts.high === 2, "Counts high issues correctly");
  assert(scoreResult.counts.autoFixable === 5, "Counts auto-fixable issues correctly");

  // 6. Analyzers on Empty / Bad Page
  const badCrawl = {
    startUrl: "http://insecure-site.com",
    origin: "http://insecure-site.com",
    pages: [
      {
        url: "http://insecure-site.com",
        title: "",
        metaDescription: "",
        canonical: "",
        viewport: "",
        htmlLang: "",
        openGraph: {},
        twitter: {},
        headings: { h1Count: 0, h1: [] },
        images: { missingAlt: 2, total: 2 },
        content: { isThinContent: true, wordCount: 15 },
        structuredData: { hasJsonLd: false },
      },
    ],
    brokenLinks: [],
    redirects: [],
    robots: { exists: false, isAllDisallowed: false, url: "http://insecure-site.com/robots.txt" },
    sitemap: { exists: false, totalUrls: 0, url: "http://insecure-site.com/sitemap.xml" },
  };

  const basicRes = analyzeBasicSeo(badCrawl);
  assert(basicRes.issues.some((i) => i.id.startsWith("missing-title")), "Catches missing title");
  assert(basicRes.issues.some((i) => i.id.startsWith("missing-meta-description")), "Catches missing description");

  const techRes = analyzeTechnicalSeo(badCrawl);
  assert(techRes.issues.some((i) => i.id === "insecure-http"), "Catches insecure HTTP");
  assert(techRes.issues.some((i) => i.id === "missing-robots-txt"), "Catches missing robots.txt");

  const socialRes = analyzeSocialSeo(badCrawl);
  assert(socialRes.issues.some((i) => i.id === "missing-og-image"), "Catches missing og:image");

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

