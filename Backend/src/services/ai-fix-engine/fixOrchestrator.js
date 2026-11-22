import { resolveTargetFile } from "./fileResolver.js";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder.js";
import { generateAiFix } from "./aiProvider.js";
import { generateUnifiedDiff } from "./patchGenerator.js";
import { validateCode } from "./codeValidator.js";

/**
 * Orchestrates end-to-end AI code fix generation for an individual SEO issue.
 *
 * @param {Object} options
 * @param {Object} options.issue - The detected SEO issue
 * @param {Object} options.repositoryAnalysis - Result of Feature 1 inspection
 * @param {Object} options.repoDetails - { owner, repo, branch, accessToken }
 * @param {string} [options.additionalInstructions] - User input for regenerating this fix
 * @returns {Promise<Object>} Complete structured fix object
 */
export async function orchestrateFix({
  issue,
  repositoryAnalysis,
  repoDetails,
  additionalInstructions = "",
}) {
  const { owner, repo, branch = "main", accessToken } = repoDetails || {};

  // 1. Resolve target file & fetch original content from GitHub
  const resolved = await resolveTargetFile({
    issue,
    repositoryAnalysis,
    owner,
    repo,
    branch,
    accessToken,
  });

  // 2. Build framework-aware prompt
  const systemPrompt = buildSystemPrompt({
    framework: repositoryAnalysis?.framework,
    router: repositoryAnalysis?.router,
  });

  const userPrompt = buildUserPrompt({
    issue,
    targetFile: resolved.targetPath,
    action: resolved.action,
    originalContent: resolved.originalContent,
    additionalInstructions,
    repoDetails: { owner, repo },
  });

  // 3. Generate fix using AI provider
  const aiResult = await generateAiFix({
    systemPrompt,
    userPrompt,
  });

  const finalTargetPath = resolved.targetPath;
  const proposedContent = aiResult.proposedContent;

  // 4. Generate unified diff
  const diffResult = generateUnifiedDiff(
    finalTargetPath,
    resolved.originalContent,
    proposedContent
  );

  // 5. Validate the generated code
  const validation = validateCode({
    filePath: finalTargetPath,
    proposedContent,
    framework: repositoryAnalysis?.framework,
    router: repositoryAnalysis?.router,
    currentRemoteContent: resolved.originalContent,
    expectedHash: resolved.originalHash,
    action: resolved.action,
  });

  return {
    issueId: issue.id || "seo-issue",
    issueTitle: issue.title || "SEO Issue",
    issueCategory: issue.category || "General",
    severity: issue.severity || "medium",
    affectedUrl: issue.affectedUrl || "/",
    framework: {
      name: repositoryAnalysis?.framework?.name || "React",
      version: repositoryAnalysis?.framework?.version || "",
      router: repositoryAnalysis?.router?.type || "",
    },
    analysis: {
      rootCause: aiResult.rootCause,
      explanation: aiResult.explanation,
      recommendation: aiResult.recommendation,
      risk: aiResult.risk || "low",
      riskAssessment: aiResult.riskAssessment,
    },
    patch: {
      filePath: finalTargetPath,
      action: resolved.action,
      originalContent: resolved.originalContent,
      proposedContent,
      diff: diffResult.diff,
      originalHash: resolved.originalHash,
      additions: diffResult.additions,
      deletions: diffResult.deletions,
    },
    validation,
    status: "proposed",
  };
}

