/**
 * AI SEO Code Fix Controller (Feature 4)
 * Generates, validates, and manages framework-specific code fixes for detected SEO issues.
 */

import User from "../models/user.model.js";
import SeoAudit from "../models/seoAudit.model.js";
import RepositoryAnalysis from "../models/repositoryAnalysis.model.js";
import SeoFix from "../models/seoFix.model.js";
import SeoPublish from "../models/seoPublish.model.js";
import { orchestrateFix } from "../services/ai-fix-engine/fixOrchestrator.js";
import {
  runRuleFixForIssue,
  detectSeoState,
  generateBootstrapFixes,
} from "../services/ai-fix-engine/rule-engine/index.js";
import { enhanceFixWithAiCopy } from "../services/ai-fix-engine/rule-engine/aiCopywriter.js";
import { publishFixes } from "../services/github/publish/publishService.js";
import { fetchFileContent } from "../services/github/fileContentService.js";
import {
  generatePreviewMetadataPatch,
  getPreviewTargetCandidates,
} from "../services/ai-fix-engine/previewPatchService.js";

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
  if (project) {
    orConditions.push({ projectId: project });
    orConditions.push({ repoFullName: project });
  }
  if (repo && owner) {
    const full = `${owner}/${repo}`;
    orConditions.push({ repoFullName: full });
    const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orConditions.push({ repoFullName: { $regex: new RegExp(`^${escaped}$`, "i") } });
  }
  if (repo) {
    orConditions.push({ projectId: repo });
  }

  return { project, repo, owner, fullName: `${owner}/${repo}`, orConditions };
}

/**
 * POST /api/projects/:projectId/fixes/generate (or /api/fixes/generate)
 * Generates framework-specific AI source code fixes for detected SEO issues.
 */
export const generateFixes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { project, repo, owner, fullName, orConditions } = resolveProjectConditions(req, user);

    if (orConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project or repository identifier is required.",
      });
    }

    // 1. Fetch latest SEO audit (try with userId first, then fallback to global match)
    let latestAudit = null;
    if (user?._id) {
      latestAudit = await SeoAudit.findOne({
        userId: user._id,
        $or: orConditions,
      }).sort({ createdAt: -1 });
    }
    if (!latestAudit) {
      latestAudit = await SeoAudit.findOne({ $or: orConditions }).sort({ createdAt: -1 });
    }

    if (!latestAudit) {
      return res.status(200).json({
        success: false,
        code: "AUDIT_REQUIRED",
        hasAudit: false,
        message: "No SEO audit found for this project. Please run an SEO audit before generating fixes.",
      });
    }

    // 2. Fetch repository analysis (Framework and structure)
    const repoAnalysis = await RepositoryAnalysis.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    // 3. Determine which issues to fix
    const requestedIssueIds = req.body?.issueIds;
    let targetIssues = [];

    if (Array.isArray(requestedIssueIds) && requestedIssueIds.length > 0) {
      targetIssues = (latestAudit.issues || []).filter((issue) =>
        requestedIssueIds.includes(issue.id)
      );
    } else {
      // Pick all issues that are not passed/resolved, prioritizing autoFixable
      targetIssues = (latestAudit.issues || []).filter(
        (issue) => issue.status !== "passed" && issue.status !== "resolved"
      );
    }

    if (targetIssues.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending issues requiring fixes.",
        data: [],
      });
    }

    const mode = req.body?.mode || "rules"; // 'rules' (default) | 'rules+ai-copy' | 'ai'
    const overrides = req.body?.overrides || {};

    const repoDetails = {
      owner,
      repo,
      branch: req.body?.branch || "main",
      accessToken: user.accessToken,
    };

    const results = [];
    const errors = [];

    for (const issue of targetIssues) {
      try {
        let fixData;

        if (mode === "ai") {
          fixData = await orchestrateFix({
            issue,
            repositoryAnalysis: repoAnalysis,
            repoDetails,
          });
          fixData.engine = "ai";
        } else {
          // Pure rule engine (default, no AI calls)
          fixData = await runRuleFixForIssue({
            issue,
            repositoryAnalysis: repoAnalysis,
            repoDetails,
            audit: latestAudit,
            options: { overrides },
          });

          // Optional AI copywriting layer for placeholders only
          if (mode === "rules+ai-copy") {
            fixData = await enhanceFixWithAiCopy({
              fix: fixData,
              crawl: latestAudit.metadata || latestAudit.crawlData?.pages?.[0] || {},
            });
          }
        }

        // Upsert into SeoFix collection
        const updatedFix = await SeoFix.findOneAndUpdate(
          {
            projectId: project || repo,
            issueId: issue.id,
          },
          {
            projectId: project || repo,
            repoFullName: fullName,
            userId: user._id,
            issueId: issue.id,
            issueTitle: issue.title,
            issueCategory: issue.category,
            severity: issue.severity,
            affectedUrl: issue.affectedUrl || "/",
            framework: fixData.framework,
            analysis: fixData.analysis,
            patch: fixData.patch,
            validation: fixData.validation,
            engine: fixData.engine || (mode === "ai" ? "ai" : "rule"),
            changes: fixData.changes || [],
            placeholders: fixData.placeholders || [],
            manualSnippet: fixData.manualSnippet || null,
            confidence: fixData.confidence || "high",
            ruleIds: fixData.ruleIds || [],
            note: fixData.note || null,
            status: fixData.status || "proposed",
            rejectionReason: null,
            approvedAt: null,
            rejectedAt: null,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        results.push(updatedFix);
      } catch (err) {
        if (err.code === "AI_KEY_MISSING") {
          return res.status(400).json({
            success: false,
            code: "AI_KEY_MISSING",
            message: "AI provider API key missing in environment (.env). Configure GEMINI_API_KEY or OPENAI_API_KEY to use full AI mode, or use default Rule-based mode.",
          });
        }
        console.error(`Failed to generate fix for issue ${issue.id}:`, err);
        errors.push({ issueId: issue.id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Generated ${results.length} code fix(es).`,
      count: results.length,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in generateFixes:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate code fixes.",
    });
  }
};

/**
 * GET /api/projects/:projectId/fixes (or /api/fixes)
 * Retrieves generated fixes with status metrics.
 */
export const getFixes = async (req, res) => {
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

    const filter = { $or: orConditions };
    if (req.query?.status) {
      filter.status = req.query.status;
    }
    if (req.query?.severity) {
      filter.severity = req.query.severity;
    }
    if (req.query?.category) {
      filter.issueCategory = req.query.category;
    }

    const fixes = await SeoFix.find(filter).sort({ createdAt: -1 });

    const allProjectFixes = await SeoFix.find({ $or: orConditions });
    const stats = {
      total: allProjectFixes.length,
      proposed: allProjectFixes.filter((f) => f.status === "proposed").length,
      approved: allProjectFixes.filter((f) => f.status === "approved").length,
      rejected: allProjectFixes.filter((f) => f.status === "rejected").length,
      manual: allProjectFixes.filter((f) => f.status === "manual").length,
      critical: allProjectFixes.filter((f) => f.severity === "critical").length,
      high: allProjectFixes.filter((f) => f.severity === "high").length,
      medium: allProjectFixes.filter((f) => f.severity === "medium").length,
      low: allProjectFixes.filter((f) => f.severity === "low").length,
    };

    return res.status(200).json({
      success: true,
      count: fixes.length,
      stats,
      data: fixes,
    });
  } catch (error) {
    console.error("Error fetching fixes:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch code fixes.",
    });
  }
};

/**
 * GET /api/projects/:projectId/fixes/:fixId (or /api/fixes/:fixId)
 * Fetches a single fix by ID.
 */
export const getFixById = async (req, res) => {
  try {
    const fix = await SeoFix.findById(req.params.fixId);
    if (!fix) {
      return res.status(404).json({ success: false, message: "Fix not found." });
    }
    return res.status(200).json({ success: true, data: fix });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/fixes/:fixId/approve (or /api/fixes/:fixId/approve)
 * Marks a code fix as approved.
 */
export const approveFix = async (req, res) => {
  try {
    const fix = await SeoFix.findById(req.params.fixId);
    if (!fix) {
      return res.status(404).json({ success: false, message: "Fix not found." });
    }

    if (!fix.patch) {
      fix.patch = { filePath: "unknown", proposedContent: "" };
    } else if (typeof fix.patch.proposedContent !== "string") {
      fix.patch.proposedContent = fix.patch.originalContent || "";
    }

    fix.status = "approved";
    fix.approvedAt = new Date();
    fix.rejectionReason = null;
    await fix.save();

    return res.status(200).json({
      success: true,
      message: "Code fix approved successfully.",
      data: fix,
    });
  } catch (error) {
    console.error("Error approving fix:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/fixes/:fixId/reject (or /api/fixes/:fixId/reject)
 * Marks a code fix as rejected with user reason.
 */
export const rejectFix = async (req, res) => {
  try {
    const fix = await SeoFix.findById(req.params.fixId);
    if (!fix) {
      return res.status(404).json({ success: false, message: "Fix not found." });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required to reject a fix.",
      });
    }

    if (!fix.patch) {
      fix.patch = { filePath: "unknown", proposedContent: "" };
    } else if (typeof fix.patch.proposedContent !== "string") {
      fix.patch.proposedContent = fix.patch.originalContent || "";
    }

    fix.status = "rejected";
    fix.rejectedAt = new Date();
    fix.rejectionReason = reason.trim();
    await fix.save();

    return res.status(200).json({
      success: true,
      message: "Code fix rejected.",
      data: fix,
    });
  } catch (error) {
    console.error("Error rejecting fix:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/fixes/:fixId/regenerate (or /api/fixes/:fixId/regenerate)
 * Re-runs AI code fix engine with additional user instructions.
 */
export const regenerateFix = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const fix = await SeoFix.findById(req.params.fixId);
    if (!fix) {
      return res.status(404).json({ success: false, message: "Fix not found." });
    }

    const { project, repo, owner, orConditions } = resolveProjectConditions(req, user);

    // Fetch repository analysis
    const repoAnalysis = await RepositoryAnalysis.findOne({
      $or: orConditions.length > 0 ? orConditions : [{ projectId: fix.projectId }],
    });

    const repoDetails = {
      owner: owner || fix.repoFullName?.split("/")[0],
      repo: repo || fix.repoFullName?.split("/")[1] || fix.projectId,
      branch: req.body?.branch || "main",
      accessToken: user.accessToken,
    };

    const issue = {
      id: fix.issueId,
      title: fix.issueTitle,
      category: fix.issueCategory,
      severity: fix.severity,
      affectedUrl: fix.affectedUrl,
      description: fix.analysis?.rootCause,
      recommendation: fix.analysis?.recommendation,
    };

    const additionalInstructions = req.body?.instructions || req.body?.prompt || "";
    const mode = req.body?.mode || (fix.engine === "ai" ? "ai" : "rules");
    const overrides = req.body?.overrides || {};

    let fixData;
    if (mode === "ai") {
      fixData = await orchestrateFix({
        issue,
        repositoryAnalysis: repoAnalysis,
        repoDetails,
        additionalInstructions,
      });
      fixData.engine = "ai";
    } else {
      // Fetch latest audit if available for context
      const latestAudit = await SeoAudit.findOne({
        $or: orConditions.length > 0 ? orConditions : [{ projectId: fix.projectId }],
      }).sort({ createdAt: -1 });

      fixData = await runRuleFixForIssue({
        issue,
        repositoryAnalysis: repoAnalysis,
        repoDetails,
        audit: latestAudit || { metadata: {} },
        options: { overrides },
      });

      if (mode === "rules+ai-copy") {
        fixData = await enhanceFixWithAiCopy({
          fix: fixData,
          crawl: latestAudit?.metadata || latestAudit?.crawlData?.pages?.[0] || {},
        });
      }
    }

    fix.framework = fixData.framework;
    fix.analysis = fixData.analysis;
    fix.patch = fixData.patch;
    fix.validation = fixData.validation;
    fix.engine = fixData.engine || (mode === "ai" ? "ai" : "rule");
    fix.changes = fixData.changes || [];
    fix.placeholders = fixData.placeholders || [];
    fix.manualSnippet = fixData.manualSnippet || null;
    fix.confidence = fixData.confidence || "high";
    fix.ruleIds = fixData.ruleIds || [];
    fix.note = fixData.note || null;
    fix.status = fixData.status || "proposed";
    fix.rejectionReason = null;
    fix.userFeedback = additionalInstructions;
    fix.approvedAt = null;
    fix.rejectedAt = null;
    await fix.save();

    return res.status(200).json({
      success: true,
      message: "Fix successfully regenerated.",
      data: fix,
    });
  } catch (error) {
    if (error.code === "AI_KEY_MISSING") {
      return res.status(503).json({
        success: false,
        code: "AI_KEY_MISSING",
        message: error.message,
      });
    }
    console.error("Error regenerating fix:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/repos/:repo/fixes/publish (or /api/projects/:projectId/fixes/publish)
 * Bundles approved fixes and publishes via GitHub Pull Request or direct commit.
 */
export const publishFixesHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { repo, owner, fullName } = resolveProjectConditions(req, user);
    const {
      fixIds,
      mode = "pr",
      confirmDirect,
      confirmRepoName,
      allowPlaceholders,
      prTitle,
      updateExistingPr,
    } = req.body || {};

    const result = await publishFixes({
      user,
      repo: fullName || repo,
      fixIds,
      mode,
      options: {
        owner,
        confirmDirect,
        confirmRepoName,
        allowPlaceholders,
        prTitle,
        updateExistingPr,
      },
    });

    if (result.code === "EXISTING_PR_OPEN") {
      return res.status(409).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in publishFixesHandler:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to publish code fixes.",
    });
  }
};

/**
 * GET /api/repos/:repo/fixes/publish/:publishId
 * Fetches status and results of a published PR or direct commit.
 */
export const getPublishStatusHandler = async (req, res) => {
  try {
    const { publishId } = req.params;
    const record = await SeoPublish.findById(publishId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Publish record not found." });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/repos/:repo/fixes/preview-diff
 * Computes deterministic diff and code patch from edited preview metadata.
 */
export const previewDiffHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { repo, owner, orConditions } = resolveProjectConditions(req, user);
    const repoAnalysis = await RepositoryAnalysis.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    const metadata = req.body?.metadata || {};
    const branch = req.body?.branch || repoAnalysis?.repo?.defaultBranch || "main";

    const repoDetails = {
      owner,
      repo,
      branch,
      accessToken: user.accessToken,
    };

    const requestedFile = req.body?.targetFile || req.body?.filePath;
    const baseCandidates = getPreviewTargetCandidates(repoAnalysis);
    const candidates = requestedFile ? [requestedFile, ...baseCandidates] : baseCandidates;
    let targetPath = candidates[0] || "index.html";
    let originalContent = "";

    for (const cand of candidates) {
      const content = await fetchFileContent(owner, repo, cand, branch, user.accessToken);
      if (content !== null) {
        targetPath = cand;
        originalContent = content;
        break;
      }
    }

    const patchResult = generatePreviewMetadataPatch({
      repoAnalysis,
      targetPath,
      originalContent,
      metadata,
    });

    return res.status(200).json({
      success: true,
      data: patchResult,
    });
  } catch (error) {
    console.error("Error in previewDiffHandler:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate preview diff.",
    });
  }
};

/**
 * POST /api/repos/:repo/fixes/preview-publish
 * Directly publishes preview metadata edits (title, favicon, description) to main repository via Pull Request.
 */
export const previewPublishHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { project, repo, owner, fullName, orConditions } = resolveProjectConditions(req, user);
    const repoAnalysis = await RepositoryAnalysis.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    const metadata = req.body?.metadata || {};
    const branch = req.body?.branch || repoAnalysis?.repo?.defaultBranch || "main";
    const mode = req.body?.mode || "pr";
    const prTitle = req.body?.prTitle || "SEO: Update page title, favicon and meta description";
    const updateExistingPr = Boolean(req.body?.updateExistingPr);
    const confirmDirect = Boolean(req.body?.confirmDirect);
    const confirmRepoName = req.body?.confirmRepoName;

    const repoDetails = {
      owner,
      repo,
      branch,
      accessToken: user.accessToken,
    };

    const requestedFile = req.body?.targetFile || req.body?.filePath;
    const baseCandidates = getPreviewTargetCandidates(repoAnalysis);
    const candidates = requestedFile ? [requestedFile, ...baseCandidates] : baseCandidates;
    let targetPath = candidates[0] || "index.html";
    let originalContent = "";

    for (const cand of candidates) {
      const content = await fetchFileContent(owner, repo, cand, branch, user.accessToken);
      if (content !== null) {
        targetPath = cand;
        originalContent = content;
        break;
      }
    }

    const patchResult = generatePreviewMetadataPatch({
      repoAnalysis,
      targetPath,
      originalContent,
      metadata,
    });

    if (patchResult.status === "noop" && !patchResult.diff) {
      return res.status(400).json({
        success: false,
        message: "No metadata changes detected between original code and preview.",
      });
    }

    // Upsert fix record to maintain audit trail
    const previewFix = await SeoFix.findOneAndUpdate(
      {
        projectId: project || repo,
        issueId: "preview-metadata-patch",
      },
      {
        projectId: project || repo,
        repoFullName: fullName,
        userId: user._id,
        issueId: "preview-metadata-patch",
        issueTitle: "Visual Preview Metadata Customization",
        issueCategory: "social",
        severity: "info",
        affectedUrl: "/",
        framework: patchResult.framework,
        patch: {
          filePath: patchResult.filePath || patchResult.targetFile || targetPath,
          targetFile: patchResult.targetFile || patchResult.filePath || targetPath,
          originalHash: patchResult.originalHash,
          originalContent: patchResult.originalContent,
          proposedContent: patchResult.proposedContent,
          diff: patchResult.diff,
        },
        validation: patchResult.validation,
        engine: "rule",
        changes: patchResult.changes,
        placeholders: patchResult.placeholders,
        confidence: "high",
        ruleIds: ["preview-metadata"],
        status: "approved",
        operation: "modify",
        isBootstrap: false,
        rejectionReason: null,
        approvedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const result = await publishFixes({
      user,
      repo: fullName || repo,
      fixIds: [previewFix._id],
      mode,
      options: {
        owner,
        confirmDirect,
        confirmRepoName,
        allowPlaceholders: true,
        prTitle,
        updateExistingPr,
      },
    });

    if (result.code === "EXISTING_PR_OPEN") {
      return res.status(409).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in previewPublishHandler:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to publish preview changes to GitHub.",
    });
  }
};

/**
 * GET /api/repos/:repo/fixes/detect-seo-state
 * Detects SEO baseline state ('none' | 'partial' | 'good').
 */
export const detectSeoStateHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { repo, owner, orConditions } = resolveProjectConditions(req, user);

    const latestAudit = await SeoAudit.findOne({ $or: orConditions }).sort({ createdAt: -1 });
    const repoAnalysis = await RepositoryAnalysis.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    const fileTree = (repoAnalysis?.structure?.importantFiles || []).map((f) =>
      typeof f === "string" ? f : f?.path || ""
    );

    const fileContents = {};
    if (user?.accessToken && owner && repo) {
      for (const p of fileTree.slice(0, 10)) {
        const c = await fetchFileContent(owner, repo, p, "main", user.accessToken);
        if (c) fileContents[p] = c;
      }
    }

    const state = detectSeoState(repoAnalysis, latestAudit, fileTree, fileContents);

    return res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    console.error("Error in detectSeoStateHandler:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/repos/:repo/fixes/bootstrap
 * Generates full baseline SEO configuration (Feature 5 Bootstrap).
 */
export const bootstrapFixesHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { project, repo, owner, fullName, orConditions } = resolveProjectConditions(req, user);

    const latestAudit = await SeoAudit.findOne({ $or: orConditions }).sort({ createdAt: -1 });
    const repoAnalysis = await RepositoryAnalysis.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    const fileTree = (repoAnalysis?.structure?.importantFiles || []).map((f) =>
      typeof f === "string" ? f : f?.path || ""
    );

    const fileFetcher = async (p) => {
      if (user.accessToken && owner && repo) {
        return fetchFileContent(owner, repo, p, req.body?.branch || "main", user.accessToken);
      }
      return null;
    };

    const bootstrapFixes = await generateBootstrapFixes({
      repoAnalysis,
      audit: latestAudit,
      fileTree,
      fileFetcher,
      options: req.body?.options || {},
    });

    const savedResults = [];
    for (const fixData of bootstrapFixes) {
      const updatedFix = await SeoFix.findOneAndUpdate(
        {
          projectId: project || repo,
          issueId: fixData.issueId,
        },
        {
          projectId: project || repo,
          repoFullName: fullName,
          userId: user._id,
          issueId: fixData.issueId,
          issueTitle: fixData.issueTitle,
          issueCategory: fixData.issueCategory,
          severity: fixData.severity,
          affectedUrl: fixData.affectedUrl || "/",
          framework: fixData.framework,
          analysis: fixData.analysis,
          patch: fixData.patch,
          validation: fixData.validation,
          engine: fixData.engine || "rule",
          operation: fixData.operation || "modify",
          isBootstrap: true,
          changes: fixData.changes || [],
          placeholders: fixData.placeholders || [],
          manualSnippet: fixData.manualSnippet || null,
          confidence: fixData.confidence || "high",
          ruleIds: fixData.ruleIds || [],
          status: fixData.status || "proposed",
          rejectionReason: null,
          approvedAt: null,
          rejectedAt: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedResults.push(updatedFix);
    }

    return res.status(200).json({
      success: true,
      message: `Generated ${savedResults.length} baseline SEO fix(es).`,
      count: savedResults.length,
      data: savedResults,
    });
  } catch (error) {
    console.error("Error in bootstrapFixesHandler:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


