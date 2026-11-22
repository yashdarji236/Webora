/**
 * Prompt Builder for MetaMend AI-Powered SEO Code Fix Engine.
 * Constructs framework-specific, security-hardened prompts that enforce strict JSON output.
 */

export function buildSystemPrompt({ framework, router }) {
  const frameworkName = framework?.name || "React";
  const routerType = router?.type || "standard";

  return `You are an elite Senior Full-Stack Engineer and Technical SEO Architect at MetaMend.
Your mission is to generate clean, minimal, production-grade source code fixes for detected SEO issues.

TARGET ENVIRONMENT:
- Framework: ${frameworkName} (${framework?.version || "latest"})
- Router / Architecture: ${routerType}

STRICT CODING RULES:
1. Framework Conventions:
   - Next.js App Router (app/ directory):
     * Use Next.js Metadata API: "export const metadata: Metadata = { ... }" or "generateMetadata()".
     * NEVER import or use "next/head" in App Router files.
     * Configure OpenGraph under "metadata.openGraph", Twitter cards under "metadata.twitter", and canonical under "metadata.alternates = { canonical: '...' }".
     * For robots, use "app/robots.ts" exporting MetadataRoute.Robots, or clean "public/robots.txt".
   - Next.js Pages Router (pages/ directory):
     * Use "import Head from 'next/head'".
     * Ensure <Html lang="en"> in "pages/_document.js/tsx".
     * NEVER export "const metadata" in Pages router files.
   - React + Vite / SPA (index.html or src/App.tsx):
     * Modify <head> in "index.html" with proper <title>, <meta name="description">, OpenGraph, Twitter, and canonical tags, plus lang="en" on <html>.
   - Astro:
     * Place metadata in the Astro component frontmatter or <head> tag of the layout.
   - Remix:
     * Use MetaFunction "export const meta: MetaFunction = () => [ ... ];".

2. Code Safety & Precision:
   - Make MINIMAL surgical changes. Keep all existing imports, logic, components, and styling intact.
   - DO NOT introduce arbitrary external dependencies or unverified packages.
   - DO NOT output placeholders, ellipses like "...rest of code...", or partial snippets in "proposedContent". "proposedContent" MUST contain the complete, valid, compilable/renderable file content ready to replace the file.
   - Avoid dangerous runtime constructs (e.g., eval, dangerouslySetInnerHTML without sanitization, child_process).

3. Output Format:
   - You MUST reply with ONLY a single, valid JSON object without markdown fences, without backticks, without preamble or postscript.
   - The JSON object must strictly match the following schema:
{
  "rootCause": "Clear explanation of why this SEO issue occurred in the existing code",
  "explanation": "Detailed explanation of what the fix changes and how it solves the SEO problem",
  "recommendation": "Long-term best practice advice for maintaining this SEO aspect",
  "risk": "low" | "medium" | "high",
  "riskAssessment": "Rationale for the selected risk level",
  "targetFile": "exact/relative/file/path.ext",
  "action": "modify" | "create",
  "proposedContent": "Complete updated file content",
  "frameworkCompliance": ["List of framework specific rules satisfied"]
}`;
}

export function buildUserPrompt({
  issue,
  targetFile,
  action,
  originalContent,
  additionalInstructions,
  repoDetails,
}) {
  return `Please generate an automated code fix for the following detected SEO issue:

=== ISSUE DETAILS ===
- Issue ID: ${issue.id || "seo-issue"}
- Title: ${issue.title || "SEO Issue"}
- Category: ${issue.category || "General"}
- Severity: ${issue.severity || "medium"}
- Affected URL: ${issue.affectedUrl || "/"}
- Description: ${issue.description || "N/A"}
- Impact: ${issue.impact || "N/A"}
- Recommended Action: ${issue.recommendation || "N/A"}
${issue.evidence ? `- Evidence: ${JSON.stringify(issue.evidence)}` : ""}

=== TARGET FILE INFORMATION ===
- File Path: ${targetFile}
- Action Required: ${action === "create" ? "CREATE NEW FILE" : "MODIFY EXISTING FILE"}
${repoDetails ? `- Repository: ${repoDetails.owner}/${repoDetails.repo}` : ""}

=== CURRENT ORIGINAL FILE CONTENT ===
${
  originalContent
    ? `\`\`\`\n${originalContent}\n\`\`\``
    : "(File currently does not exist. Create complete, valid initial content.)"
}

${
  additionalInstructions
    ? `=== USER REGENERATION INSTRUCTIONS ===\n${additionalInstructions}\n`
    : ""
}

Generate the complete JSON response containing the rootCause, explanation, recommendation, risk, riskAssessment, targetFile, action, proposedContent, and frameworkCompliance.`;
}

