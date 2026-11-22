/**
 * Pull Request and Commit Message Generator for MetaMend (Feature 5)
 * Produces clean, deterministic, markdown-safe PR bodies and commit messages without AI.
 */

import { getRuleReason } from "../../ai-fix-engine/rule-engine/explain.js";

/**
 * Escapes characters for GitHub Markdown table cells and safe text.
 */
function escapeMarkdown(text = "") {
  if (typeof text !== "string") return "";
  return text.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").trim();
}

/**
 * Builds the commit message for the single batched Git commit.
 *
 * @param {Array<Object>} fixes
 * @returns {string} Commit message string
 */
export function buildCommitMessage(fixes = []) {
  const allRuleIds = Array.from(
    new Set(fixes.flatMap((f) => f.ruleIds || (f.changes || []).map((c) => c.ruleId)).filter(Boolean))
  );

  const fileCount = fixes.length;
  const header = `chore(seo): add/fix SEO metadata via MetaMend (${fileCount} file${fileCount === 1 ? "" : "s"})`;

  const rulesList = allRuleIds.length > 0 ? `Rules applied:\n- ${allRuleIds.join("\n- ")}` : "Automated SEO remediation.";

  return `${header}\n\n${rulesList}\n\nGenerated automatically by MetaMend.`;
}

/**
 * Builds the PR title deterministically.
 */
export function buildPrTitle(fixes = []) {
  const count = fixes.length;
  return `SEO: fix ${count} issue${count === 1 ? "" : "s"} with MetaMend`;
}

/**
 * Builds the complete Markdown body for the Pull Request.
 *
 * @param {Object} params
 * @param {Array<Object>} params.fixes - Approved fixes being published
 * @param {Object} [params.audit] - Latest SEO audit result
 * @param {Object} [params.repoAnalysis] - Repository framework and router analysis
 * @param {Array<Object>} [params.manualFixes=[]] - Fixes requiring manual developer integration
 * @param {boolean} [params.usedFork=false] - Whether this PR comes from a fork
 * @param {string} [params.forkOwner=null] - Owner of the fork
 * @returns {string} Markdown string
 */
export function buildPrBody({
  fixes = [],
  audit = null,
  repoAnalysis = null,
  manualFixes = [],
  usedFork = false,
  forkOwner = null,
}) {
  const score = audit?.audit?.overallScore ?? "N/A";
  const grade = audit?.audit?.grade ? ` (${audit.audit.grade})` : "";
  const frameworkName = repoAnalysis?.framework?.name || "detected framework";

  // 1. Header & Summary
  const lines = [];
  lines.push("## 🚀 MetaMend Automated SEO Code Fixes");
  lines.push("");
  lines.push(`**Product tagline:** *Your SEO score, fixed in one pull request.*`);
  lines.push("");
  lines.push(`### 📊 SEO Baseline Summary`);
  lines.push(`- **SEO score before:** \`${score}/100\`${grade} (from the last audit)`);
  lines.push(`- **Framework:** \`${frameworkName}\``);
  lines.push(`- **Files included:** \`${fixes.length}\` file(s) patched or created`);
  if (usedFork && forkOwner) {
    lines.push(`- **Branch source:** Forked repository (\`${forkOwner}\`)`);
  }
  lines.push("");

  // 2. Table of changed files
  lines.push("### 📁 Changed & Created Files");
  lines.push("");
  lines.push("| File Path | Operation | Rules Applied | Confidence |");
  lines.push("| :--- | :---: | :--- | :---: |");

  for (const fix of fixes) {
    const filePath = escapeMarkdown(fix.patch?.filePath || fix.issueTitle);
    const op = (fix.operation || fix.patch?.action || "modify").toUpperCase();
    const rules = (fix.ruleIds && fix.ruleIds.length > 0)
      ? fix.ruleIds.map((r) => `\`${r}\``).join(", ")
      : "`general`";
    const conf = (fix.confidence || "high").toUpperCase();

    lines.push(`| \`${filePath}\` | **${op}** | ${rules} | ${conf} |`);
  }
  lines.push("");

  // 3. Per-change explanation list
  lines.push("### 🔍 What Changed and Why");
  lines.push("");

  for (const fix of fixes) {
    const filePath = fix.patch?.filePath || fix.issueTitle;
    const op = (fix.operation || fix.patch?.action || "modify").toUpperCase();
    lines.push(`#### \`${filePath}\` (${op})`);

    if (fix.changes && fix.changes.length > 0) {
      for (const change of fix.changes) {
        lines.push(`- **${change.description}**`);
        if (change.reason) {
          lines.push(`  *Rationale:* ${change.reason}`);
        }
      }
    } else if (fix.analysis?.explanation) {
      lines.push(`- ${fix.analysis.explanation}`);
    }

    if (fix.ruleIds && fix.ruleIds.length > 0) {
      for (const rId of fix.ruleIds) {
        const reason = getRuleReason(rId);
        if (reason && !fix.changes?.some((c) => c.reason === reason)) {
          lines.push(`  *Rule insight (\`${rId}\`):* ${reason}`);
        }
      }
    }
    lines.push("");
  }

  // 4. "Needs your attention" checklist
  const attentionItems = [];

  // Check for unresolved placeholders
  const placeholdersFound = [];
  for (const fix of fixes) {
    const proposed = fix.patch?.proposedContent || "";
    const matches = proposed.match(/\[TODO:[^\]]+\]/g) || [];
    if (matches.length > 0) {
      placeholdersFound.push({ file: fix.patch?.filePath, tags: matches });
    }
  }

  if (placeholdersFound.length > 0) {
    for (const p of placeholdersFound) {
      attentionItems.push(
        `**Unresolved Placeholders in \`${p.file}\`:** contains ${p.tags.join(", ")}. Please update with brand copy.`
      );
    }
  }

  // Check for manual fixes not included in commit
  if (manualFixes.length > 0) {
    for (const m of manualFixes) {
      const path = m.patch?.filePath || m.issueTitle;
      attentionItems.push(
        `**Manual integration recommended for \`${path}\`:** ${m.analysis?.explanation || "Requires developer layout integration"}`
      );
    }
  }

  // React SPA prerender warning
  const isReactVite = frameworkName.toLowerCase().includes("vite") || frameworkName.toLowerCase().includes("react");
  if (isReactVite) {
    attentionItems.push(
      "**Client-Rendered SPA Notice:** Social crawlers (X, LinkedIn, WhatsApp) do not execute JavaScript. Ensure you use SSR or a prerendering proxy if you require dynamic per-route social card previews."
    );
  }

  if (attentionItems.length > 0) {
    lines.push("### ⚠️ Needs Your Attention");
    lines.push("");
    for (const item of attentionItems) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push("");
  }

  // 5. Verification steps
  lines.push("### ✅ Verification Steps");
  lines.push("");
  lines.push("1. Review the proposed diffs in the **Files changed** tab.");
  lines.push("2. Run your local build and test suites:");
  lines.push("   ```bash");
  lines.push("   npm run build  # or pnpm build / yarn build");
  lines.push("   ```");
  lines.push("3. Merge this pull request into your default branch.");
  lines.push("4. Re-run your live **MetaMend SEO Audit** on your dashboard to verify that all detected issues are resolved.");
  lines.push("");

  // 6. Footer
  lines.push("---");
  lines.push(
    "*Generated by [MetaMend](https://github.com). Review before merging. Nothing was auto-merged.*"
  );

  return lines.join("\n");
}
