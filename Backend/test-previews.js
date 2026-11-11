/**
 * Feature 3 Test Suite
 * Tests Google, X/Twitter, LinkedIn, WhatsApp preview builders, fallback logic,
 * character guidance warnings, Before/After immutability, and SSRF image checks.
 */

import { generateAllPlatformPreviews, validateImageSafely } from "./src/services/social-preview/previewGenerator.js";
import { resolveSafeAssetUrl } from "./src/services/social-preview/metadataExtractor.js";

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
  console.log("RUNNING FEATURE 3 PREVIEW TESTS");
  console.log("=================================\n");

  const websiteUrl = "https://example.com/features";

  // Scenario 1: Complete metadata
  const completeMeta = {
    title: "MetaMend — Automated SEO Audits for Developers",
    description:
      "Inspect your repository, crawl your deployed website, and preview search and social cards before shipping.",
    canonical: "https://example.com/features",
    favicon: "/favicon.ico",
    openGraph: {
      title: "MetaMend | SEO Previews",
      description: "See exactly how your links render on Google, X, LinkedIn, and WhatsApp.",
      image: "/og-banner.png",
      url: "https://example.com/features",
      siteName: "MetaMend",
    },
    twitter: {
      card: "summary_large_image",
      title: "MetaMend Twitter Card",
      description: "Automated SEO inspection and visual previews.",
      image: "https://cdn.example.com/twitter.png",
      site: "@metamend",
    },
  };

  const resComplete = generateAllPlatformPreviews(completeMeta, websiteUrl, "extracted");
  assert(resComplete.previews.google.title === completeMeta.title, "Google extracts exact title");
  assert(resComplete.previews.google.favicon === "https://example.com/favicon.ico", "Resolves relative favicon safely");
  assert(resComplete.previews.twitter.cardType === "summary_large_image", "Twitter detects summary_large_image");
  assert(resComplete.previews.twitter.fallbacksUsed.length === 0, "No fallbacks needed when Twitter tags exist");
  assert(resComplete.previews.linkedin.image === "https://example.com/og-banner.png", "LinkedIn resolves relative og:image");
  assert(resComplete.previews.whatsapp.hasMissingOg === false, "WhatsApp has complete OG tags");

  // Scenario 2 & 3: Missing OpenGraph & Missing Twitter metadata -> Fallback tracking
  const partialMeta = {
    title: "Portfolio Site",
    description: "Developer portfolio showcasing full-stack web engineering projects.",
    openGraph: { title: "Portfolio OG Title", image: "" },
    twitter: {},
  };

  const resPartial = generateAllPlatformPreviews(partialMeta, websiteUrl, "extracted");
  assert(resPartial.previews.linkedin.hasMissingOg === true, "LinkedIn flags missing OG tags");
  assert(resPartial.previews.linkedin.missingOgTags.includes("og:image"), "LinkedIn lists missing og:image");
  assert(resPartial.previews.whatsapp.image === "", "WhatsApp never invents missing social image");
  assert(resPartial.previews.twitter.title === "Portfolio OG Title", "Twitter falls back to og:title");
  assert(resPartial.previews.twitter.titleSource === "fallback:og:title", "Twitter labels fallback source");
  assert(resPartial.previews.twitter.descriptionSource === "fallback:description", "Twitter falls back to meta description");
  assert(resPartial.previews.twitter.fallbacksUsed.length >= 2, "Twitter logs fallback usage");

  // Scenario 4 & 5: Long title / description warnings
  const longMeta = {
    title: "This is an extraordinarily long page title exceeding Google's sixty character display threshold easily",
    description:
      "This description intentionally exceeds one hundred and sixty characters by a substantial margin so that our search engine snippet preview generator detects truncation and warns the developer accurately.",
  };
  const resLong = generateAllPlatformPreviews(longMeta, websiteUrl, "extracted");
  assert(resLong.previews.google.titleTruncated.endsWith("..."), "Google truncates > 60 char title in preview");
  assert(resLong.previews.google.descriptionTruncated.endsWith("..."), "Google truncates > 160 char description");
  assert(resLong.previews.google.warnings.length === 2, "Generates length warnings for both title and description");

  // Scenario 6: Dangerous / invalid image URI blocked
  assert(resolveSafeAssetUrl("javascript:alert(1)", websiteUrl) === "", "Blocks javascript: URI");
  assert(resolveSafeAssetUrl("data:text/html,<script>", websiteUrl) === "", "Blocks data:text/html URI");

  const unsafeImg = await validateImageSafely("http://127.0.0.1/secret.png");
  assert(!unsafeImg.accessible, "SSRF guard blocks localhost image check");

  const metadataImg = await validateImageSafely("http://169.254.169.254/latest/meta-data/");
  assert(!metadataImg.accessible, "SSRF guard blocks cloud metadata endpoint image check");

  // Scenario 7: Before / After immutability
  const beforeSnap = generateAllPlatformPreviews(partialMeta, websiteUrl, "extracted");
  const afterProposed = {
    ...partialMeta,
    title: "Improved Portfolio | Senior Full-Stack Engineer",
    openGraph: {
      title: "Improved OG Title",
      description: "Updated OpenGraph caption for LinkedIn and WhatsApp.",
      image: "https://example.com/new-og.png",
    },
  };
  const afterSnap = generateAllPlatformPreviews(afterProposed, websiteUrl, "proposed");
  assert(beforeSnap.previews.google.title === "Portfolio Site", "Before remains immutable");
  assert(afterSnap.previews.google.title === "Improved Portfolio | Senior Full-Stack Engineer", "After reflects proposed edits");
  assert(afterSnap.previews.linkedin.image === "https://example.com/new-og.png", "After updates LinkedIn image");

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

