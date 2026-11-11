/**
 * WhatsApp Link Sharing Preview Builder
 */

export function buildWhatsappPreview(normalized) {
  const { title, description, openGraph, domainInfo, websiteUrl, sourceType } = normalized;

  const missingOgTags = [];
  if (!openGraph.title) missingOgTags.push("og:title");
  if (!openGraph.description) missingOgTags.push("og:description");
  if (!openGraph.image) missingOgTags.push("og:image");

  // WhatsApp primarily relies on OpenGraph tags (fallback to page title/description only if OG missing, clearly labeled)
  const resolvedTitle = openGraph.title || title || "";
  const titleSource = openGraph.title ? "og:title" : title ? "fallback:title" : "missing";

  const resolvedDescription = openGraph.description || description || "";
  const descriptionSource = openGraph.description
    ? "og:description"
    : description
    ? "fallback:description"
    : "missing";

  const resolvedUrl = openGraph.url || websiteUrl || "";

  return {
    platform: "whatsapp",
    sourceType,
    domain: domainInfo.domain,
    url: resolvedUrl,
    title: resolvedTitle,
    titleSource,
    description: resolvedDescription,
    descriptionSource,
    image: openGraph.image || "",
    imageSource: openGraph.image ? "og:image" : "missing",
    missingOgTags,
    hasMissingOg: missingOgTags.length > 0,
    disclaimer:
      "Actual appearance may vary depending on WhatsApp's link-preview generation and caching.",
  };
}

