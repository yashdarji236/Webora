/**
 * SEO Audit Controller
 * Manages live crawling, multi-category SEO analysis, scoring calculation, and persistence.
 */

import User from "../models/user.model.js";
import SeoAudit from "../models/seoAudit.model.js";
import RepositoryAnalysis from "../models/repositoryAnalysis.model.js";
import { validateUrlSafety } from "../services/crawler/urlValidator.js";
import { crawlWebsite } from "../services/crawler/websiteCrawler.js";
import { analyzeBasicSeo } from "../services/seo-audit/basicSeoAnalyzer.js";
import { analyzeTechnicalSeo } from "../services/seo-audit/technicalSeoAnalyzer.js";
import { analyzeSocialSeo } from "../services/seo-audit/socialSeoAnalyzer.js";
import { analyzeContentSeo } from "../services/seo-audit/contentSeoAnalyzer.js";
import { analyzeStructuredData } from "../services/seo-audit/structuredDataAnalyzer.js";
import { analyzePerformance } from "../services/seo-audit/performanceAnalyzer.js";
import { calculateSeoScore } from "../services/seo-audit/seoScoringEngine.js";

/**
 * Resolve project identifier and repo name
 */
function resolveProjectAndRepo(req, user) {
  let project = req.params?.projectId || req.body?.projectId || req.query?.projectId || "";
  let repo = req.params?.repo || req.body?.repo || req.query?.repo || project;
  let owner = req.params?.owner || req.body?.owner || req.query?.owner || user?.username || "";

  if (repo.includes("/")) {
    const parts = repo.split("/");
    owner = parts[0];
    repo = parts[1];
  }

  return {
    projectId: project || repo,
    repoName: repo,
    owner,
    fullName: `${owner}/${repo}`,
  };
}

/**
 * POST /api/audit/run or POST /api/projects/:projectId/audit
 * Executes live website crawl and comprehensive SEO audit
 */
export const runSeoAudit = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { projectId, repoName, fullName } = resolveProjectAndRepo(req, user);

    // 1. Identify Target Website URL
    let targetUrl = req.body?.url || req.query?.url || "";

    // If not in body/query, check repository analysis record for homepage or deploymentUrl
    if (!targetUrl && fullName) {
      const existingAnalysis = await RepositoryAnalysis.findOne({
        userId: user._id,
        $or: [{ "repository.fullName": fullName }, { "repository.name": repoName }],
      });

      if (existingAnalysis) {
        targetUrl =
          existingAnalysis.repository?.homepage ||
          existingAnalysis.deployment?.deploymentUrl ||
          "";
      }
    }

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        code: "URL_REQUIRED",
        message: "No live website URL found for this project. Please enter your deployed website URL.",
      });
    }

    // 2. Validate URL safety against SSRF
    const safetyCheck = await validateUrlSafety(targetUrl);
    if (!safetyCheck.valid) {
      return res.status(400).json({
        success: false,
        code: "INVALID_URL",
        message: safetyCheck.error || "Invalid or restricted URL.",
      });
    }

    const sanitizedUrl = safetyCheck.sanitizedUrl;
    const crawlStartedAt = new Date();

    // 3. Execute Live Multi-Page Crawl
    const crawlResult = await crawlWebsite(sanitizedUrl, {
      maxPages: req.body?.maxPages || 15,
      maxDepth: 3,
      concurrency: 3,
      timeoutMs: 10000,
    });

    const crawlCompletedAt = new Date();

    // 4. Run Multi-Category SEO Analyzers in parallel
    const [
      basicSeo,
      technicalSeo,
      socialSeo,
      contentSeo,
      structuredData,
      performance,
    ] = await Promise.all([
      analyzeBasicSeo(crawlResult),
      analyzeTechnicalSeo(crawlResult),
      analyzeSocialSeo(crawlResult),
      analyzeContentSeo(crawlResult),
      analyzeStructuredData(crawlResult),
      analyzePerformance(crawlResult),
    ]);

    // Combine all issues
    const allIssues = [
      ...basicSeo.issues,
      ...technicalSeo.issues,
      ...socialSeo.issues,
      ...contentSeo.issues,
      ...structuredData.issues,
      ...performance.issues,
    ];

    // 5. Calculate Deterministic SEO Health Score
    const scoringResult = calculateSeoScore(allIssues);

    // 6. Persist Audit Report to MongoDB
    const auditDoc = new SeoAudit({
      userId: user._id,
      projectId,
      repoFullName: fullName,
      websiteUrl: sanitizedUrl,
      audit: {
        status: "completed",
        overallScore: scoringResult.overallScore,
        grade: scoringResult.grade,
        totalPages: crawlResult.pagesScanned,
        totalIssues: allIssues.length,
        criticalIssues: scoringResult.counts.critical,
        highIssues: scoringResult.counts.high,
        mediumIssues: scoringResult.counts.medium,
        lowIssues: scoringResult.counts.low,
        autoFixableIssues: scoringResult.counts.autoFixable,
      },
      categories: scoringResult.categories,
      issues: allIssues,
      crawl: {
        pagesScanned: crawlResult.pagesScanned,
        pagesFailed: crawlResult.pagesFailed,
        startedAt: crawlStartedAt,
        completedAt: crawlCompletedAt,
        durationMs: crawlResult.durationMs,
        visitedUrls: Array.from(crawlResult.pages.map((p) => p.url)),
        brokenLinks: crawlResult.brokenLinks,
        redirects: crawlResult.redirects,
        robots: crawlResult.robots,
        sitemap: crawlResult.sitemap,
      },
      performance: performance.metrics,
    });

    const savedAudit = await auditDoc.save();

    return res.status(200).json({
      success: true,
      message: "SEO audit completed successfully.",
      audit: savedAudit,
    });
  } catch (error) {
    console.error("Error executing SEO audit:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete SEO audit",
      error: error.message,
    });
  }
};

/**
 * GET /api/audit/latest or GET /api/projects/:projectId/audit
 * Retrieves latest audit for project
 */
export const getLatestAudit = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { projectId, repoName, fullName } = resolveProjectAndRepo(req, user);

    const latestAudit = await SeoAudit.findOne({
      userId: user._id,
      $or: [{ projectId }, { repoFullName: fullName }, { projectId: repoName }],
    }).sort({ createdAt: -1 });

    if (!latestAudit) {
      return res.status(200).json({
        success: true,
        audit: null,
        status: "no-audit-found",
      });
    }

    return res.status(200).json({
      success: true,
      audit: latestAudit,
    });
  } catch (error) {
    console.error("Error retrieving latest audit:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve latest audit",
      error: error.message,
    });
  }
};

/**
 * GET /api/projects/:projectId/audit/history
 * Retrieves audit history list for trending
 */
export const getAuditHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { projectId, repoName, fullName } = resolveProjectAndRepo(req, user);

    const history = await SeoAudit.find(
      {
        userId: user._id,
        $or: [{ projectId }, { repoFullName: fullName }, { projectId: repoName }],
      },
      "audit websiteUrl createdAt"
    )
      .sort({ createdAt: -1 })
      .limit(15);

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error retrieving audit history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit history",
      error: error.message,
    });
  }
};

/**
 * GET /api/projects/:projectId/audit/:auditId
 */
export const getAuditById = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const audit = await SeoAudit.findOne({
      _id: req.params.auditId,
      userId: user._id,
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: "Audit report not found." });
    }

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

