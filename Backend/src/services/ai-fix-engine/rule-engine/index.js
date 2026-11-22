import { getRulesForIssue, getRuleById } from "./fixCatalog.js";
import { buildRuleContext, normalizeFramework } from "./context.js";
import { resolveTargetFile, calculateFileHash } from "../fileResolver.js";
import { generateUnifiedDiff } from "../patchGenerator.js";
import { validateCode, validateFilePath } from "../codeValidator.js";
import { validateTsxSyntax } from "./parsers/tsxParser.js";
export {
  detectSeoState,
  generateBootstrapFixes,
  combineBootstrapWithTargetedFixes,
} from "./bootstrap.js";

/**
 * Executes the pure rule engine on a single file with a set of rules.
 *
 * @param {Object} params
 * @param {Object} params.context - Base RuleContext
 * @param {Array<Object>} params.rules - Rules to execute sequentially
 * @returns {Object} Result of combined execution
 */
export function applyRulesToFile({ context, rules }) {
  let workingContent = context.originalContent;
  const appliedChanges = [];
  const manualItems = [];
  const placeholders = new Set();
  const ruleIdsApplied = [];
  let confidence = "high";

  for (const rule of rules) {
    if (!rule.supports(context.framework)) {
      continue;
    }

    const res = rule.apply(context, workingContent);

    if (res.status === "applied") {
      if (res.patchedContent !== null && res.patchedContent !== undefined) {
        workingContent = res.patchedContent;
      }
      if (Array.isArray(res.changes)) {
        appliedChanges.push(...res.changes);
      }
      if (Array.isArray(res.placeholders)) {
        res.placeholders.forEach((p) => placeholders.add(p));
      }
      if (res.confidence === "low") confidence = "low";
      else if (res.confidence === "medium" && confidence !== "low") confidence = "medium";

      ruleIdsApplied.push(rule.id);
    } else if (res.status === "manual") {
      manualItems.push({
        ruleId: rule.id,
        snippet: res.manualSnippet,
        reason: res.reason || "Manual integration required.",
        confidence: res.confidence || "medium",
      });
    }
  }

  return {
    workingContent,
    appliedChanges,
    manualItems,
    placeholders: Array.from(placeholders),
    ruleIdsApplied,
    confidence,
  };
}

/**
 * Orchestrates rule-based SEO fixes for all given audit issues.
 *
 * @param {Object} params
 * @param {Object} params.repoAnalysis - Result of Feature 1 inspection
 * @param {Object} params.audit - Latest SEO audit
 * @param {Function} [params.fileFetcher] - Async function to fetch file content: (path) => Promise<string|null>
 * @param {Object} [params.options={}] - { overrides: {...}, issueIds: [...] }
 * @returns {Promise<{ files: Array, manual: Array, summary: Object }>}
 */
export async function runRuleEngine({
  repoAnalysis,
  audit,
  fileFetcher,
  options = {},
}) {
  const issues = audit?.issues || [];
  const targetIssueIds = options.issueIds;
  const filteredIssues = Array.isArray(targetIssueIds) && targetIssueIds.length > 0
    ? issues.filter((i) => targetIssueIds.includes(i.id))
    : issues.filter((i) => i.status !== "passed" && i.status !== "resolved");

  const framework = normalizeFramework(repoAnalysis);

  // Group rules by target file
  const fileToRulesMap = new Map(); // targetPath -> { issues: [], rules: Set() }

  for (const issue of filteredIssues) {
    const rules = getRulesForIssue(issue.id);
    if (rules.length === 0) continue;

    // Resolve target path for this issue
    let targetPath = null;
    const issueId = (issue.id || "").toLowerCase();

    if (issueId.includes("robots")) {
      targetPath = framework === "nextjs-app" ? "app/robots.ts" : "public/robots.txt";
    } else if (issueId.includes("sitemap")) {
      targetPath = framework === "nextjs-app" ? "app/sitemap.ts" : "public/sitemap.xml";
    } else if (framework === "nextjs-app") {
      targetPath = "app/layout.tsx";
    } else if (framework === "nextjs-pages") {
      targetPath = "pages/_document.tsx";
    } else if (framework === "astro") {
      targetPath = "src/layouts/Layout.astro";
    } else {
      targetPath = "index.html";
    }

    if (!fileToRulesMap.has(targetPath)) {
      fileToRulesMap.set(targetPath, { issues: [], rules: new Set() });
    }

    const entry = fileToRulesMap.get(targetPath);
    entry.issues.push(issue);
    rules.forEach((r) => entry.rules.add(r));
  }

  const results = [];
  const manualItems = [];

  // Sort file paths deterministically
  const sortedFilePaths = Array.from(fileToRulesMap.keys()).sort();

  for (const filePath of sortedFilePaths) {
    const { issues: fileIssues, rules: ruleSet } = fileToRulesMap.get(filePath);
    const sortedRules = Array.from(ruleSet).sort((a, b) => a.id.localeCompare(b.id));

    // Fetch original file content
    let originalContent = "";
    if (typeof fileFetcher === "function") {
      originalContent = (await fileFetcher(filePath)) || "";
    }

    const originalHash = calculateFileHash(originalContent);
    const exists = originalContent.length > 0;

    const ctx = buildRuleContext({
      repoAnalysis,
      audit,
      filePath,
      originalContent,
      userOptions: options,
    });

    const execution = applyRulesToFile({ context: ctx, rules: sortedRules });

    // Validate path
    const pathCheck = validateFilePath(filePath);
    if (!pathCheck.valid) {
      manualItems.push({
        filePath,
        reason: pathCheck.errors.join(", "),
      });
      continue;
    }

    // Re-parse check for TS/JS/TSX
    let syntaxValid = true;
    let syntaxError = null;
    if (/\.(tsx?|jsx?|js|ts)$/i.test(filePath) && execution.workingContent) {
      const syn = validateTsxSyntax(execution.workingContent);
      if (!syn.valid) {
        syntaxValid = false;
        syntaxError = syn.error;
      }
    }

    if (!syntaxValid) {
      manualItems.push({
        filePath,
        reason: `Generated code failed syntax parse check: ${syntaxError}`,
      });
      continue;
    }

    // Run existing code validation pipeline
    const validation = validateCode({
      filePath,
      proposedContent: execution.workingContent,
      framework: repoAnalysis?.framework,
      router: repoAnalysis?.router,
      currentRemoteContent: originalContent,
      expectedHash: originalHash,
      action: exists ? "modify" : "create",
    });

    // Generate diff
    const diffResult = generateUnifiedDiff(filePath, originalContent, execution.workingContent);

    const isNoop = originalContent === execution.workingContent;

    const fileResult = {
      filePath,
      action: exists ? "modify" : "create",
      originalContent,
      proposedContent: execution.workingContent,
      diff: diffResult.diff,
      originalHash,
      additions: diffResult.additions,
      deletions: diffResult.deletions,
      changes: execution.appliedChanges,
      placeholders: execution.placeholders,
      ruleIds: execution.ruleIdsApplied,
      confidence: execution.confidence,
      status: isNoop ? "noop" : "applied",
      validation,
      issues: fileIssues,
    };

    results.push(fileResult);

    if (execution.manualItems.length > 0) {
      manualItems.push(...execution.manualItems.map((m) => ({ ...m, filePath })));
    }
  }

  return {
    files: results,
    manual: manualItems,
    summary: {
      totalFiles: results.length,
      applied: results.filter((f) => f.status === "applied").length,
      manual: manualItems.length,
    },
  };
}

/**
 * Runs rule engine for an individual SEO issue (compatible with existing fixOrchestrator).
 *
 * @param {Object} params
 * @param {Object} params.issue
 * @param {Object} params.repositoryAnalysis
 * @param {Object} params.repoDetails
 * @param {Object} params.audit
 * @param {Object} [params.options]
 * @returns {Promise<Object>} Formatted fix payload matching SeoFix model
 */
export async function runRuleFixForIssue({
  issue,
  repositoryAnalysis,
  repoDetails,
  audit,
  options = {},
}) {
  const { owner, repo, branch = "main", accessToken } = repoDetails || {};

  // 1. Resolve target file & fetch original content
  const resolved = await resolveTargetFile({
    issue,
    repositoryAnalysis,
    owner,
    repo,
    branch,
    accessToken,
  });

  const ctx = buildRuleContext({
    repoAnalysis: repositoryAnalysis,
    audit,
    filePath: resolved.targetPath,
    originalContent: resolved.originalContent,
    userOptions: options,
  });

  // 2. Select matching rules
  const rules = getRulesForIssue(issue.id);

  if (rules.length === 0) {
    return {
      issueId: issue.id,
      issueTitle: issue.title,
      issueCategory: issue.category,
      severity: issue.severity,
      affectedUrl: issue.affectedUrl || "/",
      framework: {
        name: repositoryAnalysis?.framework?.name || "React",
        version: repositoryAnalysis?.framework?.version || "",
        router: repositoryAnalysis?.router?.type || "",
      },
      engine: "rule",
      status: "manual",
      analysis: {
        rootCause: "No deterministic rule catalog entry for this issue.",
        explanation: "Manual configuration recommended.",
        recommendation: issue.recommendation || "",
        risk: "low",
        riskAssessment: "No automated rule available.",
      },
      patch: {
        filePath: resolved.targetPath,
        action: resolved.action,
        originalContent: resolved.originalContent,
        proposedContent: resolved.originalContent,
        diff: "(No automated rule available for this issue)",
        originalHash: resolved.originalHash,
        additions: 0,
        deletions: 0,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: [],
      placeholders: [],
      manualSnippet: null,
      confidence: "low",
      ruleIds: [],
    };
  }

  // 3. Apply rules
  const execution = applyRulesToFile({ context: ctx, rules });

  // 4. If rule returned manual
  if (execution.appliedChanges.length === 0 && execution.manualItems.length > 0) {
    const manualItem = execution.manualItems[0];
    return {
      issueId: issue.id,
      issueTitle: issue.title,
      issueCategory: issue.category,
      severity: issue.severity,
      affectedUrl: issue.affectedUrl || "/",
      framework: {
        name: repositoryAnalysis?.framework?.name || "React",
        version: repositoryAnalysis?.framework?.version || "",
        router: repositoryAnalysis?.router?.type || "",
      },
      engine: "rule",
      status: "manual",
      analysis: {
        rootCause: issue.description || "Issue requires manual intervention.",
        explanation: manualItem.reason,
        recommendation: issue.recommendation || "",
        risk: "low",
        riskAssessment: "Manual snippet provided to prevent syntax or architecture collision.",
      },
      patch: {
        filePath: resolved.targetPath,
        action: resolved.action,
        originalContent: resolved.originalContent,
        proposedContent: resolved.originalContent,
        diff: "(Manual integration required — see snippet)",
        originalHash: resolved.originalHash,
        additions: 0,
        deletions: 0,
      },
      validation: { status: "valid", warnings: [], errors: [] },
      changes: [],
      placeholders: [],
      manualSnippet: manualItem.snippet,
      confidence: manualItem.confidence,
      ruleIds: [manualItem.ruleId],
    };
  }

  // 5. Validate proposed content syntax
  if (/\.(tsx?|jsx?|js|ts)$/i.test(resolved.targetPath) && execution.workingContent) {
    const syn = validateTsxSyntax(execution.workingContent);
    if (!syn.valid) {
      return {
        issueId: issue.id,
        issueTitle: issue.title,
        issueCategory: issue.category,
        severity: issue.severity,
        affectedUrl: issue.affectedUrl || "/",
        framework: {
          name: repositoryAnalysis?.framework?.name || "React",
          version: repositoryAnalysis?.framework?.version || "",
          router: repositoryAnalysis?.router?.type || "",
        },
        engine: "rule",
        status: "manual",
        analysis: {
          rootCause: "Patched code failed syntax validation.",
          explanation: syn.error,
          recommendation: issue.recommendation || "",
          risk: "high",
          riskAssessment: "Syntax error prevented automated patch.",
        },
        patch: {
          filePath: resolved.targetPath,
          action: resolved.action,
          originalContent: resolved.originalContent,
          proposedContent: resolved.originalContent,
          diff: `Syntax validation failed: ${syn.error}`,
          originalHash: resolved.originalHash,
          additions: 0,
          deletions: 0,
        },
        validation: { status: "invalid", warnings: [], errors: [syn.error] },
        changes: [],
        placeholders: [],
        manualSnippet: null,
        confidence: "low",
        ruleIds: execution.ruleIdsApplied,
      };
    }
  }

  // 6. Generate diff
  const diffResult = generateUnifiedDiff(
    resolved.targetPath,
    resolved.originalContent,
    execution.workingContent
  );

  // 7. Validate code
  const validation = validateCode({
    filePath: resolved.targetPath,
    proposedContent: execution.workingContent,
    framework: repositoryAnalysis?.framework,
    router: repositoryAnalysis?.router,
    currentRemoteContent: resolved.originalContent,
    expectedHash: resolved.originalHash,
    action: resolved.action,
  });

  return {
    issueId: issue.id,
    issueTitle: issue.title,
    issueCategory: issue.category,
    severity: issue.severity,
    affectedUrl: issue.affectedUrl || "/",
    framework: {
      name: repositoryAnalysis?.framework?.name || "React",
      version: repositoryAnalysis?.framework?.version || "",
      router: repositoryAnalysis?.router?.type || "",
    },
    engine: "rule",
    status: "proposed",
    operation: resolved.action || "modify",
    isBootstrap: false,
    analysis: {
      rootCause: issue.description || "Technical SEO property is missing or improperly configured.",
      explanation: execution.appliedChanges.map((c) => c.description).join(" ") || "Applied deterministic rule fix.",
      recommendation: issue.recommendation || "Verify metadata dynamically across target routes.",
      risk: "low",
      riskAssessment: "Deterministic, AST-verified surgical patch.",
    },
    patch: {
      filePath: resolved.targetPath,
      action: resolved.action,
      originalContent: resolved.originalContent,
      proposedContent: execution.workingContent,
      diff: diffResult.diff,
      originalHash: resolved.originalHash,
      additions: diffResult.additions,
      deletions: diffResult.deletions,
    },
    validation,
    changes: execution.appliedChanges,
    placeholders: execution.placeholders,
    manualSnippet: null,
    confidence: execution.confidence,
    ruleIds: execution.ruleIdsApplied,
  };
}
