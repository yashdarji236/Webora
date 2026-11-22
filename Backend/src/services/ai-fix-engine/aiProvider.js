/**
 * AI Provider Service for MetaMend SEO Code Fix Engine.
 * Supports Google Gemini and OpenAI with strict JSON schema parsing and timeouts.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const REQUEST_TIMEOUT_MS = 45000;

function ensureEnvLoaded() {
  try {
    dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
    dotenv.config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });
    dotenv.config();
  } catch {
    // Ignore reload errors
  }
}

/**
 * Strips markdown code blocks if the AI model wrapped its JSON response in fences.
 */
function cleanJsonString(raw) {
  if (!raw) return "";
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  return cleaned;
}

/**
 * Call Google Gemini API
 */
async function callGemini({ systemPrompt, userPrompt, apiKey }) {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Gemini API error (${response.status}): ${errorText}`;
        try {
          const errObj = JSON.parse(errorText);
          if (errObj?.error?.message) {
            message = `Gemini API error (${response.status}): ${errObj.error.message}`;
          }
        } catch {
          // fallback to errorText
        }
        throw new Error(message);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Empty response received from Gemini API");
      }

      const parsed = JSON.parse(cleanJsonString(rawText));
      return parsed;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === "AbortError") {
        throw new Error("AI code fix generation timed out after 45 seconds.");
      }
      // If model not found or quota, try fallback model
      console.warn(`Gemini model ${model} failed, attempting next if available:`, err.message);
    }
  }

  throw lastError || new Error("Failed to generate code fix with Gemini");
}

/**
 * Call OpenAI API
 */
async function callOpenAI({ systemPrompt, userPrompt, apiKey }) {
  const url = "https://api.openai.com/v1/chat/completions";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error("Empty response received from OpenAI API");
    }

    return JSON.parse(cleanJsonString(rawText));
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("AI code fix generation timed out after 45 seconds.");
    }
    throw err;
  }
}

/**
 * Main AI generation dispatcher
 */
export async function generateAiFix({ systemPrompt, userPrompt }) {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.TEST_NO_ENV_RELOAD) {
    ensureEnvLoaded();
  }
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim();

  if (!geminiKey && !openAiKey) {
    const error = new Error(
      "AI provider API key missing in environment (.env). Configure GEMINI_API_KEY or OPENAI_API_KEY to generate code fixes."
    );
    error.code = "AI_KEY_MISSING";
    throw error;
  }

  let result;
  if (geminiKey) {
    result = await callGemini({ systemPrompt, userPrompt, apiKey: geminiKey });
  } else {
    result = await callOpenAI({ systemPrompt, userPrompt, apiKey: openAiKey });
  }

  // Validate output shape
  if (!result || typeof result !== "object") {
    throw new Error("Invalid AI response: Expected JSON object");
  }

  if (typeof result.proposedContent !== "string") {
    throw new Error("Invalid AI response: 'proposedContent' string is missing or invalid");
  }

  return {
    rootCause: result.rootCause || "SEO metadata or configuration was missing or suboptimal.",
    explanation: result.explanation || "Updated source code to conform with technical SEO standards.",
    recommendation: result.recommendation || "Verify metadata dynamically across target routes.",
    risk: ["low", "medium", "high"].includes(result.risk) ? result.risk : "low",
    riskAssessment: result.riskAssessment || "Low risk additive metadata patch.",
    targetFile: result.targetFile,
    action: result.action === "create" ? "create" : "modify",
    proposedContent: result.proposedContent,
    frameworkCompliance: Array.isArray(result.frameworkCompliance) ? result.frameworkCompliance : [],
  };
}

