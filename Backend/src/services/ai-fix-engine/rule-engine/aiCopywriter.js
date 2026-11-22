import { generateAiFix } from "../aiProvider.js";
import { generateUnifiedDiff } from "../patchGenerator.js";
import { validateTsxSyntax } from "./parsers/tsxParser.js";

/**
 * Proposes concise AI copywriting for fields left as TODO placeholders.
 * Strictly adheres to privacy: sends ONLY minimal text context (H1, title, excerpt), NEVER source code.
 *
 * @param {Object} params
 * @param {Object} params.fix - Fix result containing placeholders
 * @param {Object} params.crawl - Minimal crawl text context
 * @returns {Promise<Object>} Updated fix object
 */
export async function enhanceFixWithAiCopy({ fix, crawl = {} }) {
  if (!fix.placeholders || fix.placeholders.length === 0) {
    return fix;
  }

  // Check if AI keys are present
  const hasKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasKey) {
    return fix;
  }

  const hasTitlePlaceholder = fix.placeholders.some((p) => p.includes("title"));
  const hasDescPlaceholder = fix.placeholders.some((p) => p.includes("description"));

  if (!hasTitlePlaceholder && !hasDescPlaceholder) {
    return fix;
  }

  const systemPrompt = `You are a technical SEO copywriter.
Output ONLY a JSON object with proposed text:
{
  "title": "30-60 character compelling page title (if requested)",
  "description": "120-160 character engaging meta description (if requested)"
}
Strict rules:
- NEVER output markdown fences or backticks.
- Title must be between 30 and 60 characters.
- Description must be between 120 and 160 characters.
- Base text strictly on the provided context.`;

  const userPrompt = `Page Context:
- Current H1: ${crawl.h1 || "Home"}
- Page Title: ${crawl.title || "Website"}
- Site Name: ${crawl.siteName || "Company"}
${crawl.description ? `- Existing text: ${crawl.description}` : ""}

Please provide:
${hasTitlePlaceholder ? "- title (30-60 characters)" : ""}
${hasDescPlaceholder ? "- description (120-160 characters)" : ""}`;

  try {
    const aiRes = await generateAiFix({ systemPrompt, userPrompt });

    let updatedContent = fix.patch.proposedContent;
    const resolvedPlaceholders = [];

    if (hasTitlePlaceholder && aiRes.title && typeof aiRes.title === "string") {
      const cleanTitle = aiRes.title.trim().replace(/^["']|["']$/g, "");
      if (cleanTitle.length >= 20 && cleanTitle.length <= 70) {
        for (const p of fix.placeholders) {
          if (p.includes("title") && updatedContent.includes(p)) {
            updatedContent = updatedContent.replace(p, cleanTitle);
            resolvedPlaceholders.push(p);
            fix.changes.push({
              description: `AI copywriting: populated title "${cleanTitle}" (${cleanTitle.length} chars).`,
              reason: "Filled placeholder using privacy-safe minimal context.",
            });
          }
        }
      }
    }

    if (hasDescPlaceholder && aiRes.description && typeof aiRes.description === "string") {
      const cleanDesc = aiRes.description.trim().replace(/^["']|["']$/g, "");
      if (cleanDesc.length >= 100 && cleanDesc.length <= 170) {
        for (const p of fix.placeholders) {
          if (p.includes("description") && updatedContent.includes(p)) {
            updatedContent = updatedContent.replace(p, cleanDesc);
            resolvedPlaceholders.push(p);
            fix.changes.push({
              description: `AI copywriting: populated meta description (${cleanDesc.length} chars).`,
              reason: "Filled placeholder using privacy-safe minimal context.",
            });
          }
        }
      }
    }

    if (resolvedPlaceholders.length > 0) {
      // Re-validate syntax
      if (/\.(tsx?|jsx?|js|ts)$/i.test(fix.patch.filePath)) {
        const syn = validateTsxSyntax(updatedContent);
        if (!syn.valid) {
          return fix; // Do not apply if syntax broke
        }
      }

      // Recompute diff
      const newDiff = generateUnifiedDiff(
        fix.patch.filePath,
        fix.patch.originalContent,
        updatedContent
      );

      fix.patch.proposedContent = updatedContent;
      fix.patch.diff = newDiff.diff;
      fix.patch.additions = newDiff.additions;
      fix.patch.deletions = newDiff.deletions;
      fix.placeholders = fix.placeholders.filter((p) => !resolvedPlaceholders.includes(p));
      fix.confidence = fix.placeholders.length === 0 ? "high" : "medium";
      fix.note = "Rule-based AST patch with AI copywriting enhancement.";
    }
  } catch (err) {
    console.warn("AI copy enhancement skipped:", err.message);
  }

  return fix;
}
