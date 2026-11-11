/**
 * Google Search SERP Preview Builder
 */

export function buildGooglePreview(normalized) {
  const { title, description, canonical, favicon, openGraph, domainInfo, websiteUrl, sourceType } = normalized;

  const displayTitle = title || "";
  const displayDescription = description || "";
  const siteName = openGraph.siteName || domainInfo.domain || "";
  const displayUrl = canonical || websiteUrl || "";

  const warnings = [];
  if (!displayTitle) {
    warnings.push("Missing <title> tag — Google will attempt to infer a heading from page content.");
  } else if (displayTitle.length > 60) {
    warnings.push(`Title (${displayTitle.length} chars) may be truncated at ~60 characters.`);
  } else if (displayTitle.length < 25) {
    warnings.push(`Title (${displayTitle.length} chars) is short; consider 30–60 characters.`);
  }

  if (!displayDescription) {
    warnings.push("Missing meta description — Google will auto-generate a snippet from body text.");
  } else if (displayDescription.length > 160) {
    warnings.push(`Meta description (${displayDescription.length} chars) may truncate around 155–160 characters.`);
  } else if (displayDescription.length < 50) {
    warnings.push(`Meta description (${displayDescription.length} chars) is short; target 120–160 characters.`);
  }

  return {
    platform: "google",
    sourceType,
    siteName,
    domain: domainInfo.domain,
    breadcrumb: domainInfo.breadcrumb,
    displayUrl,
    favicon: favicon || "",
    title: displayTitle,
    titleTruncated: displayTitle.length > 60 ? `${displayTitle.slice(0, 58)}...` : displayTitle,
    titleLength: displayTitle.length,
    description: displayDescription,
    descriptionTruncated:
      displayDescription.length > 160 ? `${displayDescription.slice(0, 157)}...` : displayDescription,
    descriptionLength: displayDescription.length,
    missingTitle: !displayTitle,
    missingDescription: !displayDescription,
    warnings,
    disclaimer:
      "Preview is an approximation. Google may rewrite titles and descriptions based on the search query and page content.",
  };
}

