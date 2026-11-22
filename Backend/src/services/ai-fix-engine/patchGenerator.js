/**
 * Patch Generator Service for MetaMend AI Code Fix Engine.
 * Generates unified diffs and patch metrics between original and proposed code.
 */

/**
 * Computes a standard unified diff string from original to proposed lines.
 * Uses a line-based diff algorithm with context lines and hunk headers.
 */
export function generateUnifiedDiff(filePath, originalContent = "", proposedContent = "") {
  const origLines = (originalContent || "").replace(/\r\n/g, "\n").split("\n");
  const propLines = (proposedContent || "").replace(/\r\n/g, "\n").split("\n");

  // Handle new file creation
  if (!originalContent) {
    const diffHeader = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${propLines.length} @@\n`;
    const diffBody = propLines.map((l) => `+${l}`).join("\n");
    return {
      diff: diffHeader + diffBody,
      additions: propLines.length,
      deletions: 0,
      totalChanges: propLines.length,
    };
  }

  // Handle exact match
  if (originalContent.replace(/\r\n/g, "\n") === proposedContent.replace(/\r\n/g, "\n")) {
    return {
      diff: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${origLines.length} +1,${propLines.length} @@\n(No changes)`,
      additions: 0,
      deletions: 0,
      totalChanges: 0,
    };
  }

  // Compute Longest Common Subsequence table for line-accurate diffing
  const n = origLines.length;
  const m = propLines.length;

  // For very large files, guard table memory
  const maxCells = 3000 * 3000;
  if (n * m > maxCells) {
    // Fast block fallback
    const diffHeader = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${n} +1,${m} @@\n`;
    const deletions = origLines.map((l) => `-${l}`).join("\n");
    const additions = propLines.map((l) => `+${l}`).join("\n");
    return {
      diff: `${diffHeader}${deletions}\n${additions}`,
      additions: m,
      deletions: n,
      totalChanges: n + m,
    };
  }

  // Dynamic programming LCS table
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (origLines[i] === propLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to find diff operations
  let i = n;
  let j = m;
  const edits = []; // { type: 'keep' | 'add' | 'del', text, origIndex, propIndex }

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === propLines[j - 1]) {
      edits.unshift({ type: "keep", text: origLines[i - 1], origLine: i, propLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.unshift({ type: "add", text: propLines[j - 1], propLine: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      edits.unshift({ type: "del", text: origLines[i - 1], origLine: i });
      i--;
    }
  }

  let additions = 0;
  let deletions = 0;

  for (const edit of edits) {
    if (edit.type === "add") additions++;
    if (edit.type === "del") deletions++;
  }

  // Group into hunks with context
  const CONTEXT_LINES = 3;
  const hunks = [];
  let currentHunk = null;

  for (let idx = 0; idx < edits.length; idx++) {
    const edit = edits[idx];
    const isChange = edit.type === "add" || edit.type === "del";

    if (isChange) {
      if (!currentHunk) {
        // Start new hunk, grab preceding context
        const start = Math.max(0, idx - CONTEXT_LINES);
        currentHunk = {
          edits: edits.slice(start, idx + 1),
          startEditIndex: start,
        };
      } else {
        currentHunk.edits.push(edit);
      }
    } else if (currentHunk) {
      // Check how many keep lines ahead until next change
      let lookaheadHasChange = false;
      for (let k = idx; k < Math.min(edits.length, idx + CONTEXT_LINES + 1); k++) {
        if (edits[k].type === "add" || edits[k].type === "del") {
          lookaheadHasChange = true;
          break;
        }
      }

      if (lookaheadHasChange) {
        currentHunk.edits.push(edit);
      } else {
        // Add trailing context lines up to CONTEXT_LINES
        const trailing = edits.slice(idx, Math.min(edits.length, idx + CONTEXT_LINES));
        currentHunk.edits.push(...trailing);
        hunks.push(currentHunk);
        currentHunk = null;
        idx += trailing.length - 1;
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  // If no hunks generated but there were changes, make one full hunk
  if (hunks.length === 0 && (additions > 0 || deletions > 0)) {
    hunks.push({ edits, startEditIndex: 0 });
  }

  // Format hunks into standard unified diff string
  const diffLines = [`--- a/${filePath}`, `+++ b/${filePath}`];

  for (const hunk of hunks) {
    let origStart = 0;
    let origCount = 0;
    let propStart = 0;
    let propCount = 0;

    for (const edit of hunk.edits) {
      if (edit.type === "keep") {
        if (!origStart && edit.origLine) origStart = edit.origLine;
        if (!propStart && edit.propLine) propStart = edit.propLine;
        origCount++;
        propCount++;
      } else if (edit.type === "del") {
        if (!origStart && edit.origLine) origStart = edit.origLine;
        origCount++;
      } else if (edit.type === "add") {
        if (!propStart && edit.propLine) propStart = edit.propLine;
        propCount++;
      }
    }

    diffLines.push(`@@ -${origStart || 1},${origCount} +${propStart || 1},${propCount} @@`);

    for (const edit of hunk.edits) {
      const prefix = edit.type === "add" ? "+" : edit.type === "del" ? "-" : " ";
      diffLines.push(`${prefix}${edit.text}`);
    }
  }

  return {
    diff: diffLines.join("\n"),
    additions,
    deletions,
    totalChanges: additions + deletions,
  };
}

