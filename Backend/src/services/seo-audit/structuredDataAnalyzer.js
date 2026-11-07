/**
 * Structured Data Analyzer
 * Inspects JSON-LD, Microdata, Schema.org entities, and syntax validity.
 */

const KNOWN_SCHEMA_TYPES = new Set([
  "Organization",
  "WebSite",
  "WebPage",
  "Article",
  "NewsArticle",
  "BlogPosting",
  "Product",
  "BreadcrumbList",
  "LocalBusiness",
  "Person",
  "Event",
  "SoftwareApplication",
  "FAQPage",
  "HowTo",
]);

export function analyzeStructuredData(crawlData) {
  const issues = [];
  const homepage = crawlData.pages[0];

  if (!homepage) return { issues };

  const detectedSchemas = [];
  let hasValidSchema = false;

  for (const page of crawlData.pages) {
    if (page.structuredData && page.structuredData.items) {
      for (const item of page.structuredData.items) {
        if (!item.valid) {
          issues.push({
            id: `invalid-jsonld-syntax-${page.url}`,
            title: `Invalid JSON-LD Syntax (${new URL(page.url).pathname})`,
            category: "Structured Data",
            severity: "high",
            affectedUrl: page.url,
            affectedUrls: [page.url],
            description: `JSON-LD structured data block failed to parse: ${item.error || "syntax error"}.`,
            impact: "Search engines cannot read broken JSON-LD and will ignore rich snippet eligibility.",
            recommendation: "Ensure valid JSON formatting with double-quoted strings and escaped characters.",
            autoFixable: true,
            source: "html-parser",
            evidence: item.raw ? item.raw.slice(0, 100) : "Malformed JSON-LD payload",
          });
        } else {
          hasValidSchema = true;
          const type = item.type || "Custom";
          detectedSchemas.push({ type, pageUrl: page.url });
        }
      }
    }
  }

  // If no structured data found on homepage at all
  if (!homepage.structuredData.hasJsonLd) {
    issues.push({
      id: "missing-schema-homepage",
      title: "No Structured Data (Schema.org / JSON-LD) Detected",
      category: "Structured Data",
      severity: "medium",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: "Homepage does not provide JSON-LD structured data (e.g. Organization, WebSite, SoftwareApplication).",
      impact: "Misses out on Google rich snippets, knowledge graph panels, and enhanced search listings.",
      recommendation: 'Add a JSON-LD script declaring your Organization or WebSite entity with logo, name, and URL.',
      autoFixable: true,
      source: "html-parser",
      evidence: 'No <script type="application/ld+json"> tag detected.',
    });
  }

  return {
    issues,
    detectedSchemas,
    hasValidSchema,
  };
}

