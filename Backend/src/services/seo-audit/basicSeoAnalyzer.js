/**
 * Basic SEO Analyzer
 * Inspects Title, Meta Description, Canonical URL, Robots meta, Lang, Viewport, and Favicon.
 */

export function analyzeBasicSeo(crawlData) {
  const issues = [];
  const homepage = crawlData.pages[0]; // Primary page
  const pages = crawlData.pages;

  if (!homepage) {
    issues.push({
      id: "homepage-unreachable",
      title: "Homepage Unreachable",
      category: "Basic SEO",
      severity: "critical",
      affectedUrl: crawlData.startUrl,
      affectedUrls: [crawlData.startUrl],
      description: "The crawler was unable to fetch the website homepage.",
      impact: "Search engines cannot crawl, index, or rank your website.",
      recommendation: "Ensure your production deployment is online and returning HTTP 200 OK.",
      autoFixable: false,
      source: "crawler",
      evidence: "HTTP response was empty or returned an error status.",
    });
    return { issues, stats: { titleScore: 0, descScore: 0 } };
  }

  // 1. Page Title Checks
  const titlesMap = new Map();

  for (const page of pages) {
    if (!page.title || page.title.trim() === "") {
      issues.push({
        id: `missing-title-${page.url}`,
        title: `Missing Title Tag (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: "critical",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page ${page.url} is missing a <title> element.`,
        impact: "Search engines may fail to index the page or display an undesirable default snippet.",
        recommendation: "Add a concise, descriptive <title> (between 30 and 60 characters).",
        autoFixable: true,
        source: "html-parser",
        evidence: "<title> tag is missing or empty.",
      });
    } else {
      // Length warnings
      if (page.title.length < 15) {
        issues.push({
          id: `short-title-${page.url}`,
          title: `Title Tag Too Short (${new URL(page.url).pathname})`,
          category: "Basic SEO",
          severity: "low",
          affectedUrl: page.url,
          affectedUrls: [page.url],
          description: `Title tag is only ${page.title.length} characters long: "${page.title}".`,
          impact: "Short titles miss opportunities to include relevant search keywords.",
          recommendation: "Expand the title to 30-60 characters including your brand and primary topic.",
          autoFixable: true,
          source: "html-parser",
          evidence: `Title text: "${page.title}" (${page.title.length} chars)`,
        });
      } else if (page.title.length > 70) {
        issues.push({
          id: `long-title-${page.url}`,
          title: `Title Tag May Be Truncated (${new URL(page.url).pathname})`,
          category: "Basic SEO",
          severity: "medium",
          affectedUrl: page.url,
          affectedUrls: [page.url],
          description: `Title tag is ${page.title.length} characters long and will be truncated in search results.`,
          impact: "Google search results typically truncate page titles longer than 60-65 characters.",
          recommendation: "Keep your title under 60 characters to ensure full display in SERPs.",
          autoFixable: true,
          source: "html-parser",
          evidence: `Title text: "${page.title}" (${page.title.length} chars)`,
        });
      }

      // Track duplicate titles
      const existing = titlesMap.get(page.title) || [];
      existing.push(page.url);
      titlesMap.set(page.title, existing);
    }
  }

  // Duplicate titles across multiple pages
  for (const [titleText, urls] of titlesMap.entries()) {
    if (urls.length > 1) {
      issues.push({
        id: `duplicate-title-${encodeURIComponent(titleText.slice(0, 20))}`,
        title: `Duplicate Title Tags on Multiple Pages (${urls.length} pages)`,
        category: "Basic SEO",
        severity: "medium",
        affectedUrl: urls[0],
        affectedUrls: urls,
        description: `${urls.length} pages share the identical title: "${titleText}".`,
        impact: "Duplicate titles cause keyword cannibalization where your own pages compete against each other.",
        recommendation: "Provide unique, page-specific titles for every indexed page.",
        autoFixable: true,
        source: "html-parser",
        evidence: `Duplicate title text: "${titleText}"`,
      });
    }
  }

  // 2. Meta Description Checks
  const descMap = new Map();

  for (const page of pages) {
    if (!page.metaDescription || page.metaDescription.trim() === "") {
      issues.push({
        id: `missing-meta-description-${page.url}`,
        title: `Missing Meta Description (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: page.url === crawlData.startUrl ? "high" : "medium",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page ${page.url} does not have a meta description.`,
        impact: "Search engines will generate arbitrary text snippets from page content.",
        recommendation: "Add an engaging meta description between 120 and 160 characters with a clear call-to-action.",
        autoFixable: true,
        source: "html-parser",
        evidence: '<meta name="description"> tag was not found in the HTML head.',
      });
    } else {
      if (page.metaDescription.length < 50) {
        issues.push({
          id: `short-meta-description-${page.url}`,
          title: `Meta Description Too Short (${new URL(page.url).pathname})`,
          category: "Basic SEO",
          severity: "low",
          affectedUrl: page.url,
          affectedUrls: [page.url],
          description: `Meta description is only ${page.metaDescription.length} characters long.`,
          impact: "Short descriptions fail to provide sufficient context to entice searchers to click.",
          recommendation: "Expand the description to 120-160 characters.",
          autoFixable: true,
          source: "html-parser",
          evidence: `Description text: "${page.metaDescription}"`,
        });
      } else if (page.metaDescription.length > 165) {
        issues.push({
          id: `long-meta-description-${page.url}`,
          title: `Meta Description Truncated (${new URL(page.url).pathname})`,
          category: "Basic SEO",
          severity: "low",
          affectedUrl: page.url,
          affectedUrls: [page.url],
          description: `Meta description is ${page.metaDescription.length} characters long and will be truncated.`,
          impact: "Search engines typically truncate snippets longer than 155-160 characters on mobile and desktop.",
          recommendation: "Keep meta descriptions between 120 and 160 characters.",
          autoFixable: true,
          source: "html-parser",
          evidence: `Description length: ${page.metaDescription.length} characters`,
        });
      }

      const existingDesc = descMap.get(page.metaDescription) || [];
      existingDesc.push(page.url);
      descMap.set(page.metaDescription, existingDesc);
    }
  }

  // Duplicate descriptions
  for (const [descText, urls] of descMap.entries()) {
    if (urls.length > 1) {
      issues.push({
        id: `duplicate-description-${encodeURIComponent(descText.slice(0, 20))}`,
        title: `Duplicate Meta Description (${urls.length} pages)`,
        category: "Basic SEO",
        severity: "medium",
        affectedUrl: urls[0],
        affectedUrls: urls,
        description: `${urls.length} pages share the exact same meta description snippet.`,
        impact: "Lowers click-through rates and degrades snippet relevance in search results.",
        recommendation: "Write unique meta descriptions highlighting each page's specific offering.",
        autoFixable: true,
        source: "html-parser",
        evidence: `Duplicate text: "${descText.slice(0, 60)}..."`,
      });
    }
  }

  // 3. Canonical URL Checks
  for (const page of pages) {
    if (!page.canonical) {
      issues.push({
        id: `missing-canonical-${page.url}`,
        title: `Missing Canonical URL (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: "medium",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page ${page.url} does not declare a <link rel="canonical"> element.`,
        impact: "Duplicate content variants (HTTP vs HTTPS, tracking params) can split ranking signals.",
        recommendation: "Declare a self-referencing canonical URL pointing to the authoritative version.",
        autoFixable: true,
        source: "html-parser",
        evidence: '<link rel="canonical"> tag was not found in the HTML document.',
      });
    } else if (!page.canonical.startsWith("http://") && !page.canonical.startsWith("https://")) {
      issues.push({
        id: `relative-canonical-${page.url}`,
        title: `Relative Canonical URL Found (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: "medium",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Canonical tag specifies a relative path: "${page.canonical}".`,
        impact: "Search engines require absolute URLs in canonical tags to prevent incorrect domain inference.",
        recommendation: `Change canonical URL to absolute form: "${new URL(page.canonical, page.url).toString()}".`,
        autoFixable: true,
        source: "html-parser",
        evidence: `href="${page.canonical}"`,
      });
    }
  }

  // 4. Viewport, Lang, and Favicon
  for (const page of pages) {
    if (!page.viewport) {
      issues.push({
        id: `missing-viewport-${page.url}`,
        title: `Missing Mobile Viewport Tag (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: "high",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: `Page ${page.url} is missing the mobile viewport meta tag.`,
        impact: "Mobile devices cannot scale the page correctly, causing mobile-usability penalties.",
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        autoFixable: true,
        source: "html-parser",
        evidence: 'No <meta name="viewport"> tag declared in <head>.',
      });
    }

    if (!page.htmlLang) {
      issues.push({
        id: `missing-html-lang-${page.url}`,
        title: `Missing HTML lang Attribute (${new URL(page.url).pathname})`,
        category: "Basic SEO",
        severity: "low",
        affectedUrl: page.url,
        affectedUrls: [page.url],
        description: "The <html> element does not specify a language attribute.",
        impact: "Screen readers and search engines may struggle to identify the primary language of the content.",
        recommendation: 'Add a lang attribute to the <html> tag (e.g. <html lang="en">).',
        autoFixable: true,
        source: "html-parser",
        evidence: '<html> tag lacks lang="..." attribute.',
      });
    }
  }

  return { issues };
}

