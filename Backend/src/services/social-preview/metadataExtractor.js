/**
 * Social & Search Metadata Extractor Service
 * Normalizes immutable extracted metadata from an audit and builds diagnostics
 * without inventing missing content.
 */

export function resolveSafeAssetUrl(rawUrl, baseUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // Reject dangerous URI schemes
  if (/^(javascript|vbscript|data:text\/html):/i.test(trimmed)) {
    return "";
  }

  try {
    const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return "";
    }
    return resolved.toString();
  } catch {
    return "";
  }
}

export function isValidHttpUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractDomainInfo(websiteUrl) {
  if (!websiteUrl) {
    return { origin: "", domain: "", breadcrumb: "" };
  }
  try {
    const parsed = new URL(websiteUrl);
    const domain = parsed.hostname.replace(/^www\./i, "");
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const breadcrumb =
      pathSegments.length > 0 ? `${domain} › ${pathSegments.join(" › ")}` : domain;
    return {
      origin: parsed.origin,
      domain,
      hostname: parsed.hostname,
      breadcrumb,
    };
  } catch {
    return { origin: "", domain: websiteUrl, breadcrumb: websiteUrl };
  }
}

/**
 * Normalize metadata snapshot from SeoAudit or proposed form payload
 * @param {object} rawMetadata
 * @param {string} websiteUrl
 * @param {"extracted"|"proposed"} sourceType
 */
export function normalizeMetadata(rawMetadata = {}, websiteUrl = "", sourceType = "extracted") {
  const meta = rawMetadata || {};
  const og = meta.openGraph || {};
  const tw = meta.twitter || {};

  const title = (meta.title || "").trim();
  const description = (meta.description || meta.metaDescription || "").trim();
  const canonical = resolveSafeAssetUrl(meta.canonical || "", websiteUrl) || (meta.canonical || "").trim();
  const favicon = resolveSafeAssetUrl(meta.favicon || "", websiteUrl);

  const openGraph = {
    title: (og.title || "").trim(),
    description: (og.description || "").trim(),
    image: resolveSafeAssetUrl(og.image || "", websiteUrl) || (og.image || "").trim(),
    url: resolveSafeAssetUrl(og.url || "", websiteUrl) || (og.url || "").trim(),
    type: (og.type || "").trim(),
    siteName: (og.siteName || "").trim(),
  };

  const twitter = {
    card: (tw.card || "").trim(),
    title: (tw.title || "").trim(),
    description: (tw.description || "").trim(),
    image: resolveSafeAssetUrl(tw.image || "", websiteUrl) || (tw.image || "").trim(),
    site: (tw.site || "").trim(),
  };

  const missingFields = [];
  const recommendations = [];

  if (!title) {
    missingFields.push({ key: "title", label: "Page Title (<title>)", priority: "critical" });
    recommendations.push("Add a concise 30–60 character <title> tag describing your page.");
  } else if (title.length > 60) {
    recommendations.push(`Title is ${title.length} characters; Google typically truncates titles above 60 characters.`);
  } else if (title.length < 25) {
    recommendations.push(`Title is short (${title.length} characters); consider adding descriptive context.`);
  }

  if (!description) {
    missingFields.push({ key: "description", label: "Meta Description", priority: "high" });
    recommendations.push("Add a compelling 120–160 character meta description to improve click-through rate.");
  } else if (description.length > 160) {
    recommendations.push(`Meta description is ${description.length} characters and may truncate in SERPs (target <= 160).`);
  }

  if (!canonical) {
    missingFields.push({ key: "canonical", label: "Canonical URL", priority: "medium" });
  }

  if (!openGraph.title) {
    missingFields.push({ key: "openGraph.title", label: "og:title", priority: "high" });
  }
  if (!openGraph.description) {
    missingFields.push({ key: "openGraph.description", label: "og:description", priority: "medium" });
  }
  if (!openGraph.image) {
    missingFields.push({ key: "openGraph.image", label: "og:image", priority: "high" });
    recommendations.push("Add an absolute 1200x630 og:image URL so shared links render rich visual previews.");
  } else if (!isValidHttpUrl(openGraph.image)) {
    recommendations.push("og:image should be an absolute https:// URL for LinkedIn, X, and WhatsApp crawlers.");
  }

  if (!twitter.card) {
    missingFields.push({ key: "twitter.card", label: "twitter:card", priority: "medium" });
    recommendations.push('Set twitter:card to "summary_large_image" for rich X/Twitter previews.');
  }

  return {
    sourceType,
    websiteUrl,
    domainInfo: extractDomainInfo(websiteUrl),
    title,
    description,
    canonical,
    favicon,
    openGraph,
    twitter,
    missingFields,
    recommendations,
  };
}

