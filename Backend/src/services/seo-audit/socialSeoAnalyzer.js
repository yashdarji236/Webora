/**
 * Social Metadata Analyzer
 * Inspects OpenGraph tags, Twitter/X cards, and social preview assets.
 */

export function analyzeSocialSeo(crawlData) {
  const issues = [];
  const homepage = crawlData.pages[0];

  if (!homepage) return { issues };

  // 1. OpenGraph Title & Description
  if (!homepage.openGraph.title) {
    issues.push({
      id: "missing-og-title",
      title: "Missing OpenGraph Title (og:title)",
      category: "Social Metadata",
      severity: "high",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: "Homepage does not declare an <meta property=\"og:title\"> tag.",
      impact: "Social platforms (LinkedIn, Facebook, Slack, WhatsApp) will fall back to raw URL or title.",
      recommendation: 'Add <meta property="og:title" content="..."> matching your primary branding.',
      autoFixable: true,
      source: "html-parser",
      evidence: "og:title tag missing in HTML head.",
    });
  }

  if (!homepage.openGraph.description) {
    issues.push({
      id: "missing-og-description",
      title: "Missing OpenGraph Description (og:description)",
      category: "Social Metadata",
      severity: "medium",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: "Homepage does not declare an <meta property=\"og:description\"> tag.",
      impact: "Shared links on messaging apps and social feeds will appear without a descriptive caption.",
      recommendation: 'Add an og:description tag providing a 1-2 sentence overview of your site.',
      autoFixable: true,
      source: "html-parser",
      evidence: "og:description tag missing in HTML head.",
    });
  }

  // 2. OpenGraph Image
  if (!homepage.openGraph.image) {
    issues.push({
      id: "missing-og-image",
      title: "Missing OpenGraph Preview Image (og:image)",
      category: "Social Metadata",
      severity: "high",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: "Homepage does not declare an og:image for rich social sharing cards.",
      impact: "Links shared on Twitter/X, LinkedIn, and messaging platforms will display as plain unstyled text without visual preview.",
      recommendation: "Provide a 1200x630px JPG or PNG image URL in your metadata.",
      autoFixable: true,
      source: "html-parser",
      evidence: 'No <meta property="og:image"> found in <head>.',
    });
  } else if (!homepage.openGraph.image.startsWith("http://") && !homepage.openGraph.image.startsWith("https://")) {
    issues.push({
      id: "relative-og-image",
      title: "Relative OpenGraph Image URL",
      category: "Social Metadata",
      severity: "medium",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: `og:image is specified as a relative path ("${homepage.openGraph.image}") rather than an absolute URL.`,
      impact: "Social media crawlers will fail to load the preview image because they cannot resolve relative paths.",
      recommendation: `Use an absolute URL: "${new URL(homepage.openGraph.image, homepage.url).toString()}".`,
      autoFixable: true,
      source: "html-parser",
      evidence: `og:image value: "${homepage.openGraph.image}"`,
    });
  }

  // 3. Twitter Card
  if (!homepage.twitter.card) {
    issues.push({
      id: "missing-twitter-card",
      title: "Missing Twitter Card Tag (twitter:card)",
      category: "Social Metadata",
      severity: "medium",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: 'Homepage is missing the <meta name="twitter:card"> configuration tag.',
      impact: "Links shared on X (Twitter) will not expand into large summary cards.",
      recommendation: 'Add <meta name="twitter:card" content="summary_large_image">.',
      autoFixable: true,
      source: "html-parser",
      evidence: "twitter:card metadata not detected.",
    });
  }

  // 4. Twitter Image
  if (!homepage.twitter.image && !homepage.openGraph.image) {
    issues.push({
      id: "missing-twitter-image",
      title: "Missing Twitter Image (twitter:image)",
      category: "Social Metadata",
      severity: "medium",
      affectedUrl: homepage.url,
      affectedUrls: [homepage.url],
      description: "Neither twitter:image nor og:image is specified for X/Twitter previews.",
      impact: "Tweets containing your website link will lack rich media cards.",
      recommendation: 'Add <meta name="twitter:image" content="..."> pointing to your 1200x630 banner.',
      autoFixable: true,
      source: "html-parser",
      evidence: "Neither twitter:image nor og:image found.",
    });
  }

  return { issues };
}

