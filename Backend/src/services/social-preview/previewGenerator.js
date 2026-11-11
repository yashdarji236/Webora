/**
 * Social & Search Preview Generator Orchestrator
 * Builds Before & After platform simulations and safely checks image accessibility.
 */

import { normalizeMetadata } from "./metadataExtractor.js";
import { buildGooglePreview } from "./googlePreview.js";
import { buildTwitterPreview } from "./twitterPreview.js";
import { buildLinkedInPreview } from "./linkedInPreview.js";
import { buildWhatsappPreview } from "./whatsappPreview.js";
import { validateUrlSafety } from "../crawler/urlValidator.js";

/**
 * Generate all four platform previews from normalized metadata
 */
export function generateAllPlatformPreviews(rawMetadata, websiteUrl, sourceType = "extracted") {
  const normalized = normalizeMetadata(rawMetadata, websiteUrl, sourceType);

  return {
    metadata: {
      title: normalized.title,
      description: normalized.description,
      canonical: normalized.canonical,
      favicon: normalized.favicon,
      openGraph: normalized.openGraph,
      twitter: normalized.twitter,
    },
    domainInfo: normalized.domainInfo,
    missingFields: normalized.missingFields,
    recommendations: normalized.recommendations,
    previews: {
      google: buildGooglePreview(normalized),
      twitter: buildTwitterPreview(normalized),
      linkedin: buildLinkedInPreview(normalized),
      whatsapp: buildWhatsappPreview(normalized),
    },
  };
}

/**
 * SSRF-safe server-side social image accessibility check (HEAD request only)
 * Reuses Feature 2's private-IP & DNS SSRF protection.
 */
export async function validateImageSafely(imageUrl) {
  const safety = await validateUrlSafety(imageUrl);
  if (!safety.valid) {
    return { accessible: false, error: safety.error || "Invalid or restricted image URL." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(safety.sanitizedUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "MetaMend-Image-Validator/1.0",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status >= 300 && res.status < 400) {
      return {
        accessible: true,
        status: res.status,
        contentType: "redirect",
        note: "Image URL redirects to another location.",
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);

    if (!res.ok) {
      return {
        accessible: false,
        status: res.status,
        error: `Image URL returned HTTP ${res.status}.`,
      };
    }

    if (contentType && !contentType.startsWith("image/")) {
      return {
        accessible: false,
        status: res.status,
        contentType,
        error: `URL returned "${contentType}" instead of an image content-type.`,
      };
    }

    if (contentLength > 8 * 1024 * 1024) {
      return {
        accessible: false,
        status: res.status,
        contentType,
        error: "Social image exceeds 8 MB recommended maximum size.",
      };
    }

    return {
      accessible: true,
      status: res.status,
      contentType: contentType || "image/*",
      sizeBytes: contentLength || null,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      accessible: false,
      error: err.name === "AbortError" ? "Image check timed out after 5s." : err.message,
    };
  }
}

