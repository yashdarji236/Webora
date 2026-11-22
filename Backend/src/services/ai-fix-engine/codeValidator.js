import { calculateFileHash } from "./fileResolver.js";

/**
 * Validates file path for path traversal vulnerabilities and system path tampering.
 */
export function validateFilePath(filePath) {
  const errors = [];
  if (!filePath || typeof filePath !== "string") {
    errors.push("Target file path is required and must be a string");
    return { valid: false, errors };
  }

  const normalized = filePath.replace(/\\/g, "/").trim();

  if (normalized.startsWith("/") || normalized.startsWith("./")) {
    errors.push("Path must be relative to repository root without leading slash or ./");
  }

  if (normalized.includes("..")) {
    errors.push("Path traversal (..) is strictly prohibited");
  }

  const forbiddenPrefixes = [".git/", ".github/", ".env", "node_modules/", "dist/", "build/"];
  for (const forbidden of forbiddenPrefixes) {
    if (normalized.toLowerCase().startsWith(forbidden)) {
      errors.push(`Modifications to system directory or sensitive file (${forbidden}) are prohibited`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    error: errors[0] || null,
  };
}

/**
 * Validates that the original file hash matches the expected hash.
 */
export function validateHash({ currentContent, expectedHash, action }) {
  if (action === "create") return { match: true };
  if (!expectedHash) return { match: true };

  const currentHash = calculateFileHash(currentContent || "");
  const match = currentHash === expectedHash;

  return {
    match,
    currentHash,
    expectedHash,
    error: match
      ? null
      : `File has changed on remote repository. Expected hash: ${expectedHash.slice(0, 8)}..., current: ${currentHash.slice(0, 8)}...`,
  };
}

/**
 * Validates bracket/brace balance in JS/TS/TSX/JSX/JSON code.
 */
function checkDelimiters(content) {
  const stack = [];
  const pairs = { "}": "{", "]": "[", ")": "(" };
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prev = i > 0 ? content[i - 1] : "";
    const next = i < content.length - 1 ? content[i + 1] : "";

    // Comments
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (!inLineComment && !inBlockComment && char === "/" && next === "/") {
        inLineComment = true;
        i++;
        continue;
      }
      if (inLineComment && (char === "\n" || char === "\r")) {
        inLineComment = false;
        continue;
      }
      if (!inLineComment && !inBlockComment && char === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (inBlockComment && char === "*" && next === "/") {
        inBlockComment = false;
        i++;
        continue;
      }
    }

    if (inLineComment || inBlockComment) continue;

    // Strings
    if (char === "'" && prev !== "\\" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && prev !== "\\" && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === "`" && prev !== "\\" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inBacktick) continue;

    // Brackets
    if (char === "{" || char === "[" || char === "(") {
      stack.push(char);
    } else if (char === "}" || char === "]" || char === ")") {
      const top = stack.pop();
      if (top !== pairs[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

/**
 * Validates proposed code for syntax, framework compliance, and security.
 */
export function validateCode({
  filePath,
  proposedContent,
  framework,
  router,
  currentRemoteContent,
  expectedHash,
  action,
}) {
  const warnings = [];
  const errors = [];

  // 1. File path validation
  const pathCheck = validateFilePath(filePath);
  if (!pathCheck.valid) {
    errors.push(...pathCheck.errors);
  }

  if (!proposedContent || typeof proposedContent !== "string") {
    errors.push("Proposed code content cannot be empty");
    return {
      status: "invalid",
      warnings,
      errors,
    };
  }

  // 2. Hash integrity validation
  if (expectedHash && currentRemoteContent !== undefined) {
    const hashCheck = validateHash({
      currentContent: currentRemoteContent,
      expectedHash,
      action,
    });
    if (!hashCheck.match) {
      warnings.push(hashCheck.error);
    }
  }

  // 3. Dangerous execution constructs
  const dangerousPatterns = [
    { pattern: /\beval\s*\(/, message: "Security violation: 'eval()' is forbidden" },
    { pattern: /\bchild_process\b/, message: "Security violation: 'child_process' is forbidden" },
    { pattern: /\bexecSync\s*\(/, message: "Security violation: 'execSync()' is forbidden" },
    { pattern: /\bprocess\.exit\s*\(/, message: "Dangerous construct: 'process.exit()' is forbidden" },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(proposedContent)) {
      errors.push(message);
    }
  }

  // 4. Bracket / syntax balance
  const isScriptOrComponent = /\.(tsx?|jsx?|json)$/i.test(filePath);
  if (isScriptOrComponent) {
    const balanced = checkDelimiters(proposedContent);
    if (!balanced) {
      warnings.push("Potential syntax warning: Unbalanced braces, brackets, or parentheses detected");
    }
  }

  // 5. Framework-specific checks
  const fwSlug = (framework?.slug || framework?.name || "").toLowerCase();
  const routerType = (router?.type || "").toLowerCase();
  const normalizedPath = filePath.replace(/\\/g, "/");

  if (fwSlug.includes("next")) {
    const isAppRouterPath = normalizedPath.startsWith("app/") || normalizedPath.startsWith("src/app/");
    const isPagesRouterPath = normalizedPath.startsWith("pages/") || normalizedPath.startsWith("src/pages/");

    if (isAppRouterPath) {
      if (/from\s+["']next\/head["']/.test(proposedContent)) {
        errors.push("Next.js App Router error: 'next/head' cannot be used in app directory. Use Metadata API instead.");
      }
    }

    if (isPagesRouterPath) {
      if (/export\s+const\s+metadata\b/.test(proposedContent)) {
        warnings.push("Next.js Pages Router warning: 'export const metadata' is only valid in App Router. Use next/head in Pages router.");
      }
    }
  }

  const status = errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";

  return {
    valid: errors.length === 0,
    status,
    warnings,
    errors,
  };
}

