/**
 * Social & Search Previews Controller (Feature 3)
 * Reads immutable metadata from Feature 2 audits and generates Before/After platform simulations.
 */

import User from "../models/user.model.js";
import SeoAudit from "../models/seoAudit.model.js";
import { fetchHtmlSafe } from "../services/crawler/htmlFetcher.js";
import { parseHtml } from "../services/crawler/htmlParser.js";
import {
  generateAllPlatformPreviews,
  validateImageSafely,
} from "../services/social-preview/previewGenerator.js";

function resolveProjectConditions(req, user) {
  const project = (req.params?.projectId || req.body?.projectId || req.query?.projectId || "").trim();
  let repo = (req.params?.repo || req.body?.repo || req.query?.repo || project).trim();
  let owner = (req.params?.owner || req.body?.owner || req.query?.owner || user?.username || "").trim();

  if (repo.includes("/")) {
    const parts = repo.split("/");
    owner = parts[0].trim();
    repo = parts[1].trim();
  }

  const orConditions = [];
  if (project) orConditions.push({ projectId: project });
  if (repo && owner) orConditions.push({ repoFullName: `${owner}/${repo}` });
  if (repo) orConditions.push({ projectId: repo });

  return { project, repo, owner, orConditions };
}

/**
 * GET /api/projects/:projectId/previews (or GET /api/previews)
 * Returns real extracted metadata & platform previews from the latest audit.
 */
export const getProjectPreviews = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { orConditions } = resolveProjectConditions(req, user);
    if (orConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project or repository identifier is required.",
      });
    }

    const latestAudit = await SeoAudit.findOne({
      userId: user._id,
      $or: orConditions,
    }).sort({ createdAt: -1 });

    if (!latestAudit) {
      return res.status(200).json({
        success: true,
        hasAudit: false,
        status: "audit-required",
        message: "Run an SEO Audit first to extract real website metadata.",
      });
    }

    let extracted = latestAudit.metadata;

    // Backfill legacy pre-Feature-3 audit doc via a single lightweight homepage fetch (no full crawl)
    const isEmptyLegacyMetadata =
      !extracted ||
      (!extracted.title &&
        !extracted.description &&
        !extracted.canonical &&
        !extracted.openGraph?.title &&
        !extracted.openGraph?.image &&
        !latestAudit.issues?.some((i) => i.id?.startsWith("missing-title")));

    if (isEmptyLegacyMetadata && latestAudit.websiteUrl) {
      try {
        const resHtml = await fetchHtmlSafe(latestAudit.websiteUrl, { timeoutMs: 8000 });
        if (resHtml.ok && resHtml.html) {
          const parsed = parseHtml(resHtml.html, resHtml.finalUrl || latestAudit.websiteUrl);
          if (parsed) {
            extracted = {
              title: parsed.title || "",
              description: parsed.metaDescription || "",
              canonical: parsed.canonical || "",
              favicon: parsed.favicon || "",
              htmlLang: parsed.htmlLang || "",
              openGraph: {
                title: parsed.openGraph?.title || "",
                description: parsed.openGraph?.description || "",
                image: parsed.openGraph?.image || "",
                url: parsed.openGraph?.url || "",
                type: parsed.openGraph?.type || "",
                siteName: parsed.openGraph?.siteName || "",
              },
              twitter: {
                card: parsed.twitter?.card || "",
                title: parsed.twitter?.title || "",
                description: parsed.twitter?.description || "",
                image: parsed.twitter?.image || "",
                site: parsed.twitter?.site || "",
              },
            };
            await SeoAudit.updateOne(
              { _id: latestAudit._id },
              { $set: { metadata: extracted } }
            );
          }
        }
      } catch (err) {
        console.warn("Legacy metadata backfill skipped:", err.message);
      }
    }

    const before = generateAllPlatformPreviews(
      extracted || {},
      latestAudit.websiteUrl,
      "extracted"
    );

    return res.status(200).json({
      success: true,
      hasAudit: true,
      auditId: latestAudit._id,
      auditedAt: latestAudit.createdAt,
      websiteUrl: latestAudit.websiteUrl,
      before,
    });
  } catch (error) {
    console.error("Error loading social previews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load social & search previews.",
      error: error.message,
    });
  }
};

/**
 * POST /api/projects/:projectId/previews/simulate (or POST /api/previews/simulate)
 * Simulates updated platform previews from proposed metadata without modifying live website or original audit.
 */
export const simulateProjectPreviews = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { orConditions } = resolveProjectConditions(req, user);
    if (orConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project or repository identifier is required.",
      });
    }

    const latestAudit = await SeoAudit.findOne({
      userId: user._id,
      $or: orConditions,
    }).sort({ createdAt: -1 });

    if (!latestAudit) {
      return res.status(400).json({
        success: false,
        status: "audit-required",
        message: "Run an SEO Audit before simulating metadata improvements.",
      });
    }

    const proposedMetadata = req.body?.proposedMetadata;
    if (!proposedMetadata || typeof proposedMetadata !== "object") {
      return res.status(400).json({
        success: false,
        message: "proposedMetadata object is required.",
      });
    }

    const before = generateAllPlatformPreviews(
      latestAudit.metadata || {},
      latestAudit.websiteUrl,
      "extracted"
    );

    const after = generateAllPlatformPreviews(
      proposedMetadata,
      latestAudit.websiteUrl,
      "proposed"
    );

    return res.status(200).json({
      success: true,
      isSimulation: true,
      websiteUrl: latestAudit.websiteUrl,
      before,
      after,
    });
  } catch (error) {
    console.error("Error simulating social previews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to simulate previews.",
      error: error.message,
    });
  }
};

/**
 * POST /api/projects/:projectId/previews/validate-image
 * SSRF-safe check to verify if an og:image / twitter:image URL returns an accessible image.
 */
export const validateSocialImage = async (req, res) => {
  try {
    const imageUrl = req.body?.imageUrl;
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        success: false,
        accessible: false,
        error: "imageUrl is required.",
      });
    }

    const result = await validateImageSafely(imageUrl.trim());
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      accessible: false,
      error: error.message,
    });
  }
};

