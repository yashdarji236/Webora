import User from "../models/user.model.js";
import RepositoryAnalysis from "../models/repositoryAnalysis.model.js";
import { fetchRepositoryMetadata } from "../services/github/repositoryService.js";
import { fetchRepositoryTree } from "../services/github/repositoryTreeService.js";
import { fetchJsonFile } from "../services/github/fileContentService.js";
import { detectFramework, detectMonorepo } from "../services/analyzer/frameworkDetector.js";
import { detectRouter } from "../services/analyzer/routerDetector.js";
import { analyzeStructure } from "../services/analyzer/structureAnalyzer.js";
import { detectSeoConfiguration } from "../services/analyzer/seoConfigDetector.js";
import { detectDeployment } from "../services/analyzer/deploymentDetector.js";

/**
 * Helper to resolve repo owner and name
 */
function resolveOwnerAndRepo(req, user) {
  let owner = req.params?.owner || req.query?.owner || req.body?.owner || "";
  let repo =
    req.params?.repo ||
    req.query?.repo ||
    req.body?.repo ||
    req.query?.repoName ||
    req.body?.repoName ||
    req.params?.projectId ||
    "";

  // If repo is in "owner/repo" format
  if (repo.includes("/")) {
    const parts = repo.split("/");
    owner = parts[0];
    repo = parts[1];
  }

  // Default owner to authenticated user's username
  if (!owner && user?.username) {
    owner = user.username;
  }

  return { owner: (owner || "").trim(), repo: (repo || "").trim() };
}

/**
 * POST /api/analysis/analyze
 * Or POST /api/analysis/:owner/:repo
 * Initiates complete repository inspection and framework detection engine.
 */
export const analyzeRepository = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.accessToken) {
      return res.status(401).json({
        success: false,
        message: "GitHub access token missing. Please sign in with GitHub again.",
      });
    }

    const { owner, repo } = resolveOwnerAndRepo(req, user);
    if (!repo) {
      return res.status(400).json({
        success: false,
        message: "Repository name is required.",
      });
    }

    const fullName = `${owner}/${repo}`;

    // 1. Fetch Repository Metadata
    let repoMeta;
    try {
      repoMeta = await fetchRepositoryMetadata(owner, repo, user.accessToken);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (repoMeta.isEmpty) {
      return res.status(200).json({
        success: true,
        data: {
          repository: repoMeta,
          framework: { name: "Empty Repository", slug: "empty", confidence: "high" },
          router: { type: "none", confidence: "high" },
          structure: { directories: [], importantFiles: [], totalFilesCount: 0, visualTree: {} },
          seoConfiguration: {},
          deployment: { platform: "None", configurationDetected: false },
          analysis: { status: "completed", lastAnalyzedAt: new Date(), errors: ["Repository is empty"] },
        },
      });
    }

    // 2. Fetch Recursive Git Tree
    const branch = repoMeta.defaultBranch || "main";
    let treeData;
    try {
      treeData = await fetchRepositoryTree(owner, repo, branch, user.accessToken);
    } catch (err) {
      console.warn(`Could not fetch git tree for ${fullName}:`, err.message);
      treeData = { items: [], totalCount: 0 };
    }

    // 3. Fetch package.json
    const packageJson = await fetchJsonFile(owner, repo, "package.json", branch, user.accessToken);

    // 4. Detect Framework, Language, Package Manager & Monorepo
    const frameworkDetection = detectFramework(packageJson, treeData.items);
    const monorepoDetection = detectMonorepo(treeData.items, packageJson);
    const framework = {
      ...frameworkDetection,
      isMonorepo: monorepoDetection.isMonorepo,
      workspacePackages: monorepoDetection.workspacePackages,
    };

    // 5. Detect Router Architecture
    const router = detectRouter(framework.slug, treeData.items, packageJson);

    // 6. Analyze Project Structure & Build Visual Tree
    const structure = analyzeStructure(treeData.items, repoMeta.name);

    // 7. Detect SEO Configuration across candidate files
    const seoConfiguration = await detectSeoConfiguration(
      owner,
      repo,
      branch,
      user.accessToken,
      framework,
      treeData.items
    );

    // 8. Detect Deployment Platform
    const deployment = detectDeployment(treeData.items, repoMeta.homepage);

    // 9. Persist Analysis into MongoDB
    const analysisPayload = {
      userId: user._id,
      repository: {
        name: repoMeta.name,
        fullName: repoMeta.fullName,
        owner: repoMeta.owner,
        description: repoMeta.description,
        defaultBranch: repoMeta.defaultBranch,
        language: repoMeta.language,
        visibility: repoMeta.visibility,
        isPrivate: repoMeta.isPrivate,
        isEmpty: repoMeta.isEmpty,
        stars: repoMeta.stars,
        forks: repoMeta.forks,
        latestCommit: repoMeta.latestCommit || {},
        htmlUrl: repoMeta.htmlUrl,
        homepage: repoMeta.homepage,
        lastUpdated: new Date(),
      },
      framework,
      router,
      structure,
      seoConfiguration,
      deployment,
      analysis: {
        status: "completed",
        lastAnalyzedAt: new Date(),
        errors: [],
      },
    };

    const savedDoc = await RepositoryAnalysis.findOneAndUpdate(
      { userId: user._id, "repository.fullName": repoMeta.fullName },
      analysisPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Repository analysis completed successfully.",
      data: savedDoc,
    });
  } catch (error) {
    console.error("Error analyzing repository:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete repository inspection",
      error: error.message,
    });
  }
};

/**
 * GET /api/analysis/:owner/:repo
 * Or GET /api/analysis
 * Retrieves previously saved repository analysis.
 */
export const getRepositoryAnalysis = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { owner, repo } = resolveOwnerAndRepo(req, user);
    if (!repo) {
      return res.status(400).json({ success: false, message: "Repository name is required." });
    }

    const fullName = `${owner}/${repo}`;

    const analysis = await RepositoryAnalysis.findOne({
      userId: user._id,
      $or: [
        { "repository.fullName": fullName },
        { "repository.fullName": { $regex: new RegExp(`/${repo}$`, "i") } },
        { "repository.name": repo },
      ],
    });

    if (!analysis) {
      return res.status(200).json({
        success: true,
        data: null,
        status: "not-analyzed",
        message: "No existing analysis found for this repository.",
      });
    }

    return res.status(200).json({
      success: true,
      data: analysis,
      status: analysis.analysis?.status || "completed",
    });
  } catch (error) {
    console.error("Error fetching repository analysis:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve analysis",
      error: error.message,
    });
  }
};

