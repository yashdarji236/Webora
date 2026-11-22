/**
 * GitHub Publish Service for MetaMend (Feature 5)
 * Safely bundles approved SEO fixes into a single commit and publishes via Pull Request (default)
 * or guarded direct commit to default branch.
 */

import crypto from "node:crypto";
import SeoFix from "../../../models/seoFix.model.js";
import SeoPublish from "../../../models/seoPublish.model.js";
import SeoAudit from "../../../models/seoAudit.model.js";
import RepositoryAnalysis from "../../../models/repositoryAnalysis.model.js";
import { validateFilePath, validateCode } from "../../ai-fix-engine/codeValidator.js";
import { validateTsxSyntax } from "../../ai-fix-engine/rule-engine/parsers/tsxParser.js";
import { calculateFileHash } from "../../ai-fix-engine/fileResolver.js";
import { buildPrBody, buildPrTitle, buildCommitMessage } from "./prBodyBuilder.js";

const GITHUB_API_BASE = "https://api.github.com";
const MAX_FILES_PER_PUBLISH = 50;
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB limit

/**
 * Redacts GitHub token from strings/errors to prevent token exposure.
 */
function redactToken(message = "", token = "") {
  if (!token || typeof message !== "string") return message;
  return message.split(token).join("[REDACTED]");
}

/**
 * Standard HTTP helper with token headers and rate limit tracking.
 */
function createHttp(accessToken, customFetch = null) {
  const fetcher = customFetch || globalThis.fetch;

  return async function ghRequest(url, options = {}) {
    const fullUrl = url.startsWith("http") ? url : `${GITHUB_API_BASE}${url}`;
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "MetaMend-PR-Publisher",
      ...(options.headers || {}),
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let response;
    try {
      response = await fetcher(fullUrl, { ...options, headers });
    } catch (err) {
      throw new Error(`GitHub network request failed: ${redactToken(err.message, accessToken)}`);
    }

    if (response.status === 401) {
      throw new Error("GitHub authorization failed (invalid or expired token). Please reconnect GitHub.");
    }
    if (response.status === 403 && response.headers?.get?.("x-ratelimit-remaining") === "0") {
      throw new Error("GitHub API rate limit exceeded. Please wait a few moments before publishing.");
    }

    return response;
  };
}

/**
 * Publishes approved SEO code fixes to GitHub.
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated user document
 * @param {string} params.repo - Repository name or full name (owner/repo)
 * @param {Array<string>} [params.fixIds] - Fix IDs to publish (defaults to all approved)
 * @param {string} [params.mode='pr'] - 'pr' (default) | 'direct'
 * @param {Object} [params.options={}] - Extra publish flags
 * @param {Function} [params.fetchFn] - Injected fetch for unit testing
 * @returns {Promise<Object>} Publish operation result
 */
export async function publishFixes({
  user,
  repo: repoParam,
  fixIds = null,
  mode = "pr",
  options = {},
  fetchFn = null,
}) {
  const token = user?.accessToken;
  if (!token) {
    const err = new Error("GitHub account not connected or OAuth token missing. Please sign in with GitHub.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  const http = createHttp(token, fetchFn);

  // Parse owner and repo
  let owner = "";
  let repoName = repoParam || "";
  if (repoName.includes("/")) {
    const parts = repoName.split("/");
    owner = parts[0].trim();
    repoName = parts[1].trim();
  } else {
    owner = options.owner || user.username || "";
  }

  const repoFullName = `${owner}/${repoName}`;

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. PRE-FLIGHT: LOAD FIXES & VALIDATE STATUS
    // ─────────────────────────────────────────────────────────────
    let query = {
      repoFullName: { $regex: new RegExp(`^${repoFullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    };

    if (Array.isArray(fixIds) && fixIds.length > 0) {
      query._id = { $in: fixIds };
    }

    const candidateFixes = await SeoFix.find(query);

    const approvedFixes = [];
    const skipped = [];

    for (const fix of candidateFixes) {
      if (fix.status === "approved") {
        approvedFixes.push(fix);
      } else {
        skipped.push({
          fixId: fix._id,
          reason: `Skipped because status is '${fix.status}' (only 'approved' fixes are published).`,
        });
      }
    }

    if (approvedFixes.length === 0) {
      return {
        success: false,
        code: "NO_APPROVED_FIXES",
        message: "No approved fixes found to publish. Please review and approve fixes before publishing.",
        skipped,
      };
    }

    if (approvedFixes.length > MAX_FILES_PER_PUBLISH) {
      throw new Error(`Cannot publish more than ${MAX_FILES_PER_PUBLISH} files in a single publish.`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FETCH REPO METADATA & PERMISSIONS
    // ─────────────────────────────────────────────────────────────
    const repoRes = await http(`/repos/${owner}/${repoName}`);
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Repository ${repoFullName} not found on GitHub or access is restricted.`);
      }
      const errJson = await repoRes.json().catch(() => ({}));
      throw new Error(`Failed to load repository metadata: ${errJson.message || repoRes.statusText}`);
    }

    const repoMeta = await repoRes.json();
    const defaultBranch = repoMeta.default_branch || "main";
    const canPush = Boolean(repoMeta.permissions?.push || repoMeta.permissions?.admin);

    if (repoMeta.archived) {
      throw new Error(`Repository ${repoFullName} is archived and cannot accept commits or pull requests.`);
    }
    if (repoMeta.disabled) {
      throw new Error(`Repository ${repoFullName} is disabled.`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CODE & SYNTAX VALIDATION (SERVER-SIDE GUARDS)
    // ─────────────────────────────────────────────────────────────
    for (const fix of approvedFixes) {
      const filePath = fix.patch?.filePath || fix.patch?.targetFile;
      const proposedContent = fix.patch?.proposedContent ?? "";

      // Path security
      const pathCheck = validateFilePath(filePath);
      if (!pathCheck.valid) {
        throw new Error(`Security validation failed for path "${filePath}": ${pathCheck.error || pathCheck.errors?.join("; ") || "Invalid path"}`);
      }

      // Size limit
      if (Buffer.byteLength(proposedContent, "utf8") > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File "${filePath}" exceeds the 1 MB maximum publish size limit.`);
      }

      // Code constructs & delimiter checks
      const codeCheck = validateCode({
        filePath,
        proposedContent,
        currentRemoteContent: fix.patch?.originalContent || "",
        expectedHash: fix.patch?.originalHash || "",
        action: fix.operation || fix.patch?.action || "modify",
      });
      if (!codeCheck.valid) {
        throw new Error(`Code validation rejected "${filePath}": ${codeCheck.errors.join("; ")}`);
      }

      // Syntax re-parsing for JavaScript / TypeScript
      if (/\.(tsx?|jsx?|js|ts)$/i.test(filePath) && proposedContent) {
        const syn = validateTsxSyntax(proposedContent);
        if (!syn.valid) {
          throw new Error(`Syntax error in "${filePath}" prevented publish: ${syn.error}`);
        }
      }

      // Placeholder block
      if (/\[TODO:[^\]]+\]|TODO:/i.test(proposedContent) && !options.allowPlaceholders) {
        throw new Error(
          `Publish blocked: File "${filePath}" contains unresolved TODO placeholders. Resolve all placeholders or set allowPlaceholders: true to proceed.`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. REMOTE DRIFT CHECK (DEFAULT BRANCH HEAD)
    // ─────────────────────────────────────────────────────────────
    const validFixes = [];

    for (const fix of approvedFixes) {
      const filePath = fix.patch?.filePath || fix.patch?.targetFile;
      const operation = fix.operation || fix.patch?.action || "modify";

      const fileRes = await http(
        `/repos/${owner}/${repoName}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(defaultBranch)}`
      );

      if (operation === "modify") {
        if (fileRes.status === 404) {
          // File was deleted remotely!
          fix.status = "stale";
          await fix.save();
          skipped.push({
            fixId: fix._id,
            reason: `File "${filePath}" was deleted on the default branch. Marked as stale.`,
          });
          continue;
        }

        const remoteData = await fileRes.json().catch(() => ({}));
        let remoteContent = "";
        if (remoteData.encoding === "base64" && remoteData.content) {
          remoteContent = Buffer.from(remoteData.content, "base64").toString("utf-8");
        } else if (typeof remoteData.content === "string") {
          remoteContent = remoteData.content;
        }

        const currentRemoteHash = calculateFileHash(remoteContent);
        if (fix.patch.originalHash && currentRemoteHash !== fix.patch.originalHash) {
          fix.status = "stale";
          await fix.save();
          skipped.push({
            fixId: fix._id,
            reason: `File "${filePath}" changed on GitHub since fix was generated (drift detected). Marked as stale; please regenerate.`,
          });
          continue;
        }
      } else if (operation === "create") {
        if (fileRes.status === 200) {
          // File already exists remotely!
          fix.status = "stale";
          await fix.save();
          skipped.push({
            fixId: fix._id,
            reason: `File "${filePath}" already exists on GitHub default branch. Marked as stale; please regenerate to merge.`,
          });
          continue;
        }
      }

      validFixes.push(fix);
    }

    if (validFixes.length === 0) {
      return {
        success: false,
        code: "ALL_FIXES_STALE",
        message: "All fixes were excluded due to remote drift or deletions on GitHub. Please regenerate your fixes.",
        skipped,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 5. MODE B: DIRECT COMMIT (OPT-IN, GUARDED)
    // ─────────────────────────────────────────────────────────────
    if (mode === "direct") {
      if (!options.confirmDirect) {
        throw new Error("Direct commit requires explicit confirmDirect: true flag.");
      }

      if (!canPush) {
        throw new Error("Direct commit refused: You do not have write/push permissions to this repository.");
      }

      // Check confirmRepoName match
      const providedName = (options.confirmRepoName || "").trim().toLowerCase();
      if (providedName !== repoName.toLowerCase()) {
        throw new Error(
          `Confirmation mismatch: You must type "${repoName}" in confirmRepoName to authorize a direct commit to ${defaultBranch}.`
        );
      }

      // Check branch protection
      const protRes = await http(`/repos/${owner}/${repoName}/branches/${encodeURIComponent(defaultBranch)}/protection`);
      if (protRes.status === 200) {
        const protData = await protRes.json().catch(() => ({}));
        if (protData.required_pull_request_reviews || protData.enforce_admins?.enabled) {
          throw new Error(
            `Direct commit refused: The "${defaultBranch}" branch has branch protection rules requiring pull request reviews. Please use Pull Request mode.`
          );
        }
      }

      // Execute Git Data API directly on default branch
      const baseRefRes = await http(`/repos/${owner}/${repoName}/git/ref/heads/${encodeURIComponent(defaultBranch)}`);
      if (!baseRefRes.ok) {
        throw new Error(`Could not fetch head commit of ${defaultBranch}.`);
      }
      const baseRefData = await baseRefRes.json();
      const baseCommitSha = baseRefData.object.sha;

      const baseCommitRes = await http(`/repos/${owner}/${repoName}/git/commits/${baseCommitSha}`);
      const baseCommitData = await baseCommitRes.json();
      const baseTreeSha = baseCommitData.tree.sha;

      // 1. Create blobs
      const treeEntries = [];
      for (const fix of validFixes) {
        const blobRes = await http(`/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({
            content: fix.patch.proposedContent,
            encoding: "utf-8",
          }),
        });
        const blobData = await blobRes.json();
        treeEntries.push({
          path: fix.patch?.filePath || fix.patch?.targetFile,
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        });
      }

      // 2. Create tree
      const newTreeRes = await http(`/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      });
      const newTreeData = await newTreeRes.json();

      // 3. Create commit
      const commitMessage = buildCommitMessage(validFixes);
      const newCommitRes = await http(`/repos/${owner}/${repoName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeData.sha,
          parents: [baseCommitSha],
        }),
      });
      const newCommitData = await newCommitRes.json();

      // 4. Update default branch ref (force: false)
      const updateRefRes = await http(`/repos/${owner}/${repoName}/git/refs/heads/${encodeURIComponent(defaultBranch)}`, {
        method: "PATCH",
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false,
        }),
      });

      if (!updateRefRes.ok) {
        const refErr = await updateRefRes.json().catch(() => ({}));
        throw new Error(`Direct commit rejected by GitHub (non-fast-forward or protected): ${refErr.message}`);
      }

      const revertHint = `git revert ${newCommitData.sha}`;

      // Record in DB
      const publishRecord = await SeoPublish.create({
        userId: user._id,
        repoFullName,
        mode: "direct",
        status: skipped.length > 0 ? "partial" : "success",
        branch: defaultBranch,
        commitSha: newCommitData.sha,
        prNumber: null,
        prUrl: "",
        usedFork: false,
        files: validFixes.map((f) => ({
          path: f.patch?.filePath || f.patch?.targetFile,
          operation: f.operation || f.patch?.action || "modify",
          fixId: f._id,
        })),
        skipped,
        baseSha: baseCommitSha,
        revertHint,
      });

      // Update fixes to published
      await SeoFix.updateMany(
        { _id: { $in: validFixes.map((f) => f._id) } },
        { $set: { status: "published", publishId: publishRecord._id } }
      );

      return {
        success: true,
        mode: "direct",
        status: publishRecord.status,
        publishId: publishRecord._id,
        commitSha: newCommitData.sha,
        branch: defaultBranch,
        revertHint,
        publishedCount: validFixes.length,
        skipped,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 6. MODE A: PULL REQUEST (DEFAULT)
    // ─────────────────────────────────────────────────────────────
    let targetOwner = owner;
    let targetRepo = repoName;
    let usedFork = false;
    let forkOwner = null;

    if (!canPush) {
      // User cannot push directly to upstream: fork repo
      usedFork = true;
      forkOwner = user.username;

      const forkRes = await http(`/repos/${owner}/${repoName}/forks`, { method: "POST" });
      if (!forkRes.ok && forkRes.status !== 202) {
        const forkErr = await forkRes.json().catch(() => ({}));
        throw new Error(`Unable to fork repository: ${forkErr.message || forkRes.statusText}`);
      }

      targetOwner = user.username;
      targetRepo = repoName;

      // Poll until fork is available
      let forkReady = false;
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const checkRes = await http(`/repos/${targetOwner}/${targetRepo}`);
        if (checkRes.ok) {
          forkReady = true;
          break;
        }
      }
      if (!forkReady) {
        throw new Error("Fork was created on GitHub but is still provisioning. Please try again in a few seconds.");
      }
    }

    // Check for open existing MetaMend PRs
    const pullsRes = await http(`/repos/${owner}/${repoName}/pulls?state=open&per_page=20`);
    let existingPr = null;
    if (pullsRes.ok) {
      const openPulls = await pullsRes.json();
      existingPr = openPulls.find((pr) => pr.head?.ref?.startsWith("metamend/seo-fixes-"));
    }

    if (existingPr && !options.updateExistingPr) {
      return {
        success: false,
        code: "EXISTING_PR_OPEN",
        message: `An open MetaMend SEO pull request (#${existingPr.number}) already exists.`,
        existingPr: {
          number: existingPr.number,
          url: existingPr.html_url,
          branch: existingPr.head.ref,
          title: existingPr.title,
        },
        skipped,
      };
    }

    // Fetch base tree and commit from target repo
    const baseRefRes = await http(`/repos/${targetOwner}/${targetRepo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`);
    if (!baseRefRes.ok) {
      throw new Error(`Could not fetch head commit of ${defaultBranch} on ${targetOwner}/${targetRepo}.`);
    }
    const baseRefData = await baseRefRes.json();
    const baseCommitSha = baseRefData.object.sha;

    const baseCommitRes = await http(`/repos/${targetOwner}/${targetRepo}/git/commits/${baseCommitSha}`);
    const baseCommitData = await baseCommitRes.json();
    const baseTreeSha = baseCommitData.tree.sha;

    // 1. Create blobs for all valid fixes
    const treeEntries = [];
    for (const fix of validFixes) {
      const blobRes = await http(`/repos/${targetOwner}/${targetRepo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: fix.patch.proposedContent,
          encoding: "utf-8",
        }),
      });
      if (!blobRes.ok) {
        throw new Error(`Failed to create Git blob for file "${fix.patch?.filePath || fix.patch?.targetFile}".`);
      }
      const blobData = await blobRes.json();
      treeEntries.push({
        path: fix.patch?.filePath || fix.patch?.targetFile,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }

    // 2. Create tree
    const newTreeRes = await http(`/repos/${targetOwner}/${targetRepo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    if (!newTreeRes.ok) {
      throw new Error("Failed to create Git tree.");
    }
    const newTreeData = await newTreeRes.json();

    // 3. Create commit
    const commitMessage = buildCommitMessage(validFixes);
    const newCommitRes = await http(`/repos/${targetOwner}/${targetRepo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeData.sha,
        parents: [baseCommitSha],
      }),
    });
    if (!newCommitRes.ok) {
      throw new Error("Failed to create Git commit.");
    }
    const newCommitData = await newCommitRes.json();

    let branchName = "";
    let prNumber = null;
    let prUrl = "";

    if (existingPr && options.updateExistingPr) {
      // Update existing branch fast-forward
      branchName = existingPr.head.ref;
      const patchRefRes = await http(`/repos/${targetOwner}/${targetRepo}/git/refs/heads/${encodeURIComponent(branchName)}`, {
        method: "PATCH",
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false,
        }),
      });
      if (!patchRefRes.ok) {
        throw new Error(`Could not update existing branch "${branchName}" with new commit.`);
      }
      prNumber = existingPr.number;
      prUrl = existingPr.html_url;
    } else {
      // Generate clean branch name
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
      const shortId = crypto.randomBytes(3).toString("hex");
      let baseBranchName = `metamend/seo-fixes-${datePart}-${shortId}`;
      branchName = baseBranchName;

      // Check collision
      let branchExists = true;
      let counter = 1;
      while (branchExists) {
        const checkBranch = await http(`/repos/${targetOwner}/${targetRepo}/git/ref/heads/${encodeURIComponent(branchName)}`);
        if (checkBranch.status === 404) {
          branchExists = false;
        } else {
          counter++;
          branchName = `${baseBranchName}-${counter}`;
        }
      }

      // Create branch
      const createRefRes = await http(`/repos/${targetOwner}/${targetRepo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: newCommitData.sha,
        }),
      });
      if (!createRefRes.ok) {
        const bErr = await createRefRes.json().catch(() => ({}));
        throw new Error(`Failed to create branch "${branchName}": ${bErr.message}`);
      }

      // Fetch audit and analysis context for rich PR description
      const latestAudit = await SeoAudit.findOne({ repoFullName }).sort({ createdAt: -1 });
      const repoAnalysis = await RepositoryAnalysis.findOne({ repoFullName }).sort({ createdAt: -1 });
      const manualFixes = candidateFixes.filter((f) => f.status === "manual");

      const prTitle = options.prTitle || buildPrTitle(validFixes);
      const prBody = buildPrBody({
        fixes: validFixes,
        audit: latestAudit,
        repoAnalysis,
        manualFixes,
        usedFork,
        forkOwner,
      });

      // Open Pull Request on upstream repository
      const headRef = usedFork ? `${targetOwner}:${branchName}` : branchName;
      const prRes = await http(`/repos/${owner}/${repoName}/pulls`, {
        method: "POST",
        body: JSON.stringify({
          title: prTitle,
          head: headRef,
          base: defaultBranch,
          body: prBody,
        }),
      });

      if (!prRes.ok) {
        const prErr = await prRes.json().catch(() => ({}));
        throw new Error(`Failed to open GitHub Pull Request: ${prErr.message || prRes.statusText}`);
      }

      const prData = await prRes.json();
      prNumber = prData.number;
      prUrl = prData.html_url;

      // Attempt to add 'seo' label (non-blocking)
      try {
        await http(`/repos/${owner}/${repoName}/issues/${prNumber}/labels`, {
          method: "POST",
          body: JSON.stringify({ labels: ["seo"] }),
        });
      } catch {
        // Safe to ignore if label doesn't exist
      }
    }

    // Save Publish record in DB
    const publishRecord = await SeoPublish.create({
      userId: user._id,
      repoFullName,
      mode: "pr",
      status: skipped.length > 0 ? "partial" : "success",
      branch: branchName,
      commitSha: newCommitData.sha,
      prNumber,
      prUrl,
      usedFork,
      forkOwner,
      files: validFixes.map((f) => ({
        path: f.patch?.filePath || f.patch?.targetFile,
        operation: f.operation || f.patch?.action || "modify",
        fixId: f._id,
      })),
      skipped,
      baseSha: baseCommitSha,
    });

    // Update fixes to published
    await SeoFix.updateMany(
      { _id: { $in: validFixes.map((f) => f._id) } },
      { $set: { status: "published", publishId: publishRecord._id } }
    );

    return {
      success: true,
      mode: "pr",
      status: publishRecord.status,
      publishId: publishRecord._id,
      prNumber,
      prUrl,
      branch: branchName,
      commitSha: newCommitData.sha,
      usedFork,
      forkOwner,
      publishedCount: validFixes.length,
      skipped,
    };
  } catch (err) {
    const safeError = redactToken(err.message, token);
    console.error("Error in publishFixes:", safeError);

    // Save failed record in DB
    try {
      await SeoPublish.create({
        userId: user._id,
        repoFullName,
        mode,
        status: "failed",
        error: safeError,
      });
    } catch {
      // ignore
    }

    throw new Error(safeError);
  }
}
