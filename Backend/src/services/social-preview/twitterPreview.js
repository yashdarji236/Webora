/**
 * X (Twitter) Card Preview Builder
 * Supports "summary" and "summary_large_image" with explicit fallback tracking.
 */

export function buildTwitterPreview(normalized) {
  const { title, description, openGraph, twitter, domainInfo, sourceType } = normalized;

  const cardTypeRaw = twitter.card?.toLowerCase();
  const cardType =
    cardTypeRaw === "summary" || cardTypeRaw === "summary_large_image"
      ? cardTypeRaw
      : "summary";
  const isCardFallback = !cardTypeRaw;

  let resolvedTitle = "";
  let titleSource = "missing";
  if (twitter.title) {
    resolvedTitle = twitter.title;
    titleSource = "twitter:title";
  } else if (openGraph.title) {
    resolvedTitle = openGraph.title;
    titleSource = "fallback:og:title";
  } else if (title) {
    resolvedTitle = title;
    titleSource = "fallback:title";
  }

  let resolvedDescription = "";
  let descriptionSource = "missing";
  if (twitter.description) {
    resolvedDescription = twitter.description;
    descriptionSource = "twitter:description";
  } else if (openGraph.description) {
    resolvedDescription = openGraph.description;
    descriptionSource = "fallback:og:description";
  } else if (description) {
    resolvedDescription = description;
    descriptionSource = "fallback:description";
  }

  let resolvedImage = "";
  let imageSource = "missing";
  if (twitter.image) {
    resolvedImage = twitter.image;
    imageSource = "twitter:image";
  } else if (openGraph.image) {
    resolvedImage = openGraph.image;
    imageSource = "fallback:og:image";
  }

  const fallbacksUsed = [];
  if (isCardFallback) fallbacksUsed.push('twitter:card missing (showing "summary" fallback)');
  if (titleSource.startsWith("fallback:")) fallbacksUsed.push(`Title inherited from ${titleSource.replace("fallback:", "")}`);
  if (descriptionSource.startsWith("fallback:")) fallbacksUsed.push(`Description inherited from ${descriptionSource.replace("fallback:", "")}`);
  if (imageSource.startsWith("fallback:")) fallbacksUsed.push("Image inherited from og:image");

  return {
    platform: "twitter",
    sourceType,
    cardType,
    declaredCardType: twitter.card || "",
    domain: domainInfo.domain,
    siteHandle: twitter.site || "",
    title: resolvedTitle,
    titleSource,
    description: resolvedDescription,
    descriptionSource,
    image: resolvedImage,
    imageSource,
    missingTitle: !resolvedTitle,
    missingDescription: !resolvedDescription,
    missingImage: !resolvedImage,
    missingCardTag: isCardFallback,
    fallbacksUsed,
  };
}

