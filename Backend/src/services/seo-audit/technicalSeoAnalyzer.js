/**
 * Technical SEO Analyzer
 * Inspects HTTPS, robots.txt, XML sitemaps, broken internal links, redirects, and indexability.
 */

export function analyzeTechnicalSeo(crawlData) {
  const issues = [];

  // 1. HTTPS Security Protocol
  if (crawlData.startUrl && !crawlData.startUrl.startsWith("https://")) {
    issues.push({
      id: "insecure-http",
      title: "Website Not Served Over Secure HTTPS",
      category: "Technical SEO",
      severity: "critical",
      affectedUrl: crawlData.startUrl,
      affectedUrls: [crawlData.startUrl],
      description: "The website URL is using unencrypted HTTP rather than HTTPS.",
      impact: "Google uses HTTPS as a ranking signal, and browsers will flag your website as Not Secure.",
      recommendation: "Install an SSL/TLS certificate and configure 301 redirects from HTTP to HTTPS.",
      autoFixable: false,
      source: "crawler",
      evidence: `Protocol used: ${crawlData.startUrl}`,
    });
  }

  // 2. Robots.txt Analysis
  if (!crawlData.robots.exists) {
    issues.push({
      id: "missing-robots-txt",
      title: "Missing robots.txt File",
      category: "Technical SEO",
      severity: "medium",
      affectedUrl: crawlData.robots.url,
      affectedUrls: [crawlData.robots.url],
      description: "No robots.txt file was found at the domain root.",
      impact: "Search crawlers may index admin routes, APIs, or waste crawl budget on unimportant paths.",
      recommendation: "Create a robots.txt file in your public/ root directory declaring allowed paths and your sitemap.",
      autoFixable: true,
      source: "crawler",
      evidence: `HTTP ${crawlData.robots.status} returned for ${crawlData.robots.url}`,
    });
  } else {
    // Check if site is blocking all crawlers
    if (crawlData.robots.isAllDisallowed) {
      issues.push({
        id: "robots-blocks-entire-site",
        title: "robots.txt Disallows Entire Website",
        category: "Technical SEO",
        severity: "critical",
        affectedUrl: crawlData.robots.url,
        affectedUrls: [crawlData.robots.url],
        description: 'robots.txt contains "Disallow: /" which forbids search engines from indexing the site.',
        impact: "Search engines like Google will completely de-index your website.",
        recommendation: 'Remove "Disallow: /" from your robots.txt or restrict disallow rules to private subdirectories.',
        autoFixable: true,
        source: "crawler",
        evidence: 'Rule "Disallow: /" found under User-agent: *',
      });
    }

    // Check if sitemap is linked in robots.txt
    if (!crawlData.robots.sitemaps || crawlData.robots.sitemaps.length === 0) {
      issues.push({
        id: "robots-missing-sitemap-directive",
        title: "Sitemap Not Declared in robots.txt",
        category: "Technical SEO",
        severity: "low",
        affectedUrl: crawlData.robots.url,
        affectedUrls: [crawlData.robots.url],
        description: "Your robots.txt does not link to your XML sitemap.",
        impact: "Search engine bots might take longer to discover your full site map and new pages.",
        recommendation: `Add "Sitemap: ${new URL('/sitemap.xml', crawlData.origin).toString()}" to robots.txt.`,
        autoFixable: true,
        source: "crawler",
        evidence: "No Sitemap: line found in robots.txt",
      });
    }
  }

  // 3. XML Sitemap Analysis
  if (!crawlData.sitemap.exists) {
    issues.push({
      id: "missing-sitemap-xml",
      title: "Missing XML Sitemap",
      category: "Technical SEO",
      severity: "medium",
      affectedUrl: crawlData.sitemap.url,
      affectedUrls: [crawlData.sitemap.url],
      description: "No valid XML sitemap was detected at /sitemap.xml or in robots.txt.",
      impact: "Makes it significantly harder for search engines to discover deeply nested or newly published pages.",
      recommendation: "Generate and publish an XML sitemap (e.g., Next.js sitemap.ts or static sitemap.xml).",
      autoFixable: true,
      source: "crawler",
      evidence: `HTTP ${crawlData.sitemap.status} at ${crawlData.sitemap.url}`,
    });
  } else if (crawlData.sitemap.totalUrls === 0) {
    issues.push({
      id: "empty-sitemap-xml",
      title: "XML Sitemap Contains Zero URLs",
      category: "Technical SEO",
      severity: "medium",
      affectedUrl: crawlData.sitemap.url,
      affectedUrls: [crawlData.sitemap.url],
      description: "The XML sitemap exists but does not list any valid page URLs.",
      impact: "Provides zero discoverability benefits to search crawlers.",
      recommendation: "Populate the sitemap with canonical URLs of all indexable pages.",
      autoFixable: true,
      source: "crawler",
      evidence: "0 <loc> elements discovered in XML payload.",
    });
  }

  // 4. Broken Internal Links (404s, 500s)
  if (crawlData.brokenLinks && crawlData.brokenLinks.length > 0) {
    const urls = crawlData.brokenLinks.map((b) => b.targetUrl);
    issues.push({
      id: "broken-internal-links",
      title: `Broken Internal Links Detected (${crawlData.brokenLinks.length} errors)`,
      category: "Technical SEO",
      severity: "high",
      affectedUrl: urls[0],
      affectedUrls: urls,
      description: `${crawlData.brokenLinks.length} internal links returned 4xx or 5xx HTTP error codes.`,
      impact: "Degrades user experience, wastes crawl budget, and creates dead ends for search bots.",
      recommendation: "Update or remove broken internal links pointing to non-existent pages.",
      autoFixable: false,
      source: "crawler",
      evidence: crawlData.brokenLinks.slice(0, 3).map((b) => `${b.targetUrl} (Status: ${b.status})`).join(", "),
    });
  }

  // 5. Indexability & noindex Directives
  const noIndexPages = crawlData.pages.filter((p) => p.hasNoIndex);
  if (noIndexPages.length > 0) {
    const urls = noIndexPages.map((p) => p.url);
    const isHomepageBlocked = urls.includes(crawlData.startUrl);

    issues.push({
      id: "noindex-tag-detected",
      title: isHomepageBlocked ? "Homepage Blocked by noindex Tag" : `noindex Directive on ${noIndexPages.length} Pages`,
      category: "Technical SEO",
      severity: isHomepageBlocked ? "critical" : "medium",
      affectedUrl: urls[0],
      affectedUrls: urls,
      description: `${noIndexPages.length} pages instruct search engines not to index their content.`,
      impact: "Pages with noindex will never appear in Google or other search engine results.",
      recommendation: 'Remove <meta name="robots" content="noindex"> unless the page is intentionally private.',
      autoFixable: true,
      source: "html-parser",
      evidence: 'meta robots tag containing "noindex" found.',
    });
  }

  // 6. Excessive Redirect Chains
  if (crawlData.redirects && crawlData.redirects.length > 2) {
    const fromUrls = crawlData.redirects.map((r) => r.from);
    issues.push({
      id: "redirect-chains-detected",
      title: `Multiple Redirects in Chain (${crawlData.redirects.length} hops)`,
      category: "Technical SEO",
      severity: "low",
      affectedUrl: fromUrls[0],
      affectedUrls: fromUrls,
      description: "Pages experienced multiple redirect hops before reaching their destination.",
      impact: "Slows down page load times and dilutes crawl efficiency.",
      recommendation: "Update internal links to point directly to the final destination URL.",
      autoFixable: true,
      source: "crawler",
      evidence: crawlData.redirects.map((r) => `${r.from} -> ${r.to}`).join(" | "),
    });
  }

  return { issues };
}

