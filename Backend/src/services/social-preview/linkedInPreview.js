/**
 * LinkedIn Shared Link Preview Builder
 */

export function buildLinkedInPreview(normalized) {
  const { title, description, openGraph, domainInfo, websiteUrl, sourceType } = normalized;

  const missingOgTags = [];
  if (!openGraph.title) missingOgTags.push("og:title");
  if (!openGraph.description) missingOgTags.push("og:description");
  if (!openGraph.image) missingOgTags.push("og:image");
  if (!openGraph.url) missingOgTags.push("og:url");

  const resolvedTitle = openGraph.title || title || "";
  const titleSource = openGraph.title ? "og:title" : title ? "fallback:title" : "missing";

  const resolvedDescription = openGraph.description || description || "";
  const descriptionSource = openGraph.description
    ? "og:description"
    : description
    ? "fallback:description"
    : "missing";

  const resolvedUrl = openGraph.url || websiteUrl || "";
  const siteName = openGraph.siteName || domainInfo.domain;

  return {
    platform: "linkedin",
    sourceType,
    domain: domainInfo.domain,
    siteName,
    url: resolvedUrl,
    title: resolvedTitle,
    titleSource,
    description: resolvedDescription,
    descriptionSource,
    image: openGraph.image || "",
    imageSource: openGraph.image ? "og:image" : "missing",
    missingOgTags,
    hasMissingOg: missingOgTags.length > 0,
  };
}

