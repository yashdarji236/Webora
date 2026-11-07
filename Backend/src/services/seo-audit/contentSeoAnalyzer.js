/**
 * Content SEO Analyzer
 * Inspects heading hierarchy (H1 checks), image alt text, and thin content.
 */

export function analyzeContentSeo(crawlData) {
  const issues = [];
  const pages = crawlData.pages;

  for (const page of pages) {
    const pathname = new URL(page.url).pathname || "/";

    // 1. Heading 1 Checks
    if (page.headings.h1Count === 0) {
      issues.push({
        id: `missing-h1-${page.url}`,
        title: `Missing <h1> Heading (${pathname})`,
        category: "Content SEO",
        severity: page.url === crawlData.startUrl ? "high" : "medium",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page ${page.url} does not contain an <h1> heading tag.`,
        impact: "Search engines use the primary <h1> to understand the central subject matter of the page.",
        recommendation: "Add a single, prominent <h1> heading describing the page topic.",
        autoFixable: true,
        source: "html-parser",
        evidence: "Zero <h1> tags found in document body.",
      });
    } else if (page.headings.h1Count > 1) {
      issues.push({
        id: `multiple-h1-${page.url}`,
        title: `Multiple <h1> Headings Found (${page.headings.h1Count} on ${pathname})`,
        category: "Content SEO",
        severity: "low",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page contains ${page.headings.h1Count} separate <h1> tags: ${page.headings.h1.map((h) => `"${h}"`).join(", ")}.`,
        impact: "Can confuse search engines regarding what the primary topic of the document is.",
        recommendation: "Reserve <h1> for the main page title and structure subtopics with <h2> and <h3> tags.",
        autoFixable: true,
        source: "html-parser",
        evidence: `Discovered <h1> tags: ${page.headings.h1.slice(0, 3).join(" | ")}`,
      });
    }

    // 2. Image Alt Attributes
    if (page.images.missingAlt > 0) {
      issues.push({
        id: `missing-image-alt-${page.url}`,
        title: `Images Missing alt Attributes (${page.images.missingAlt} images on ${pathname})`,
        category: "Content SEO",
        severity: "medium",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `${page.images.missingAlt} images lack an alt attribute entirely.`,
        impact: "Search engine image bots cannot index the images, and screen readers cannot describe visual content to visually impaired users.",
        recommendation: 'Add descriptive alt text to informative images (e.g. alt="Company Logo"), or alt="" if purely decorative.',
        autoFixable: true,
        source: "html-parser",
        evidence: `${page.images.missingAlt} of ${page.images.total} images have no alt tag.`,
      });
    }

    // 3. Thin Content Check
    if (page.content.isThinContent && page.content.wordCount < 100) {
      issues.push({
        id: `thin-content-${page.url}`,
        title: `Thin Page Content (${page.content.wordCount} words on ${pathname})`,
        category: "Content SEO",
        severity: "low",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page has only ${page.content.wordCount} words of text content.`,
        impact: "Pages with very little unique text content are harder for search engines to rank against comprehensive competitor pages.",
        recommendation: "Expand the text copy with relevant explanations, FAQs, or detailed feature breakdowns.",
        autoFixable: false,
        source: "html-parser",
        evidence: `Body text word count: ${page.content.wordCount} words.`,
      });
    }
  }

  return { issues };
}

