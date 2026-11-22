/**
 * Remix / Nuxt / Unknown Framework Handler
 * Returns manual guidance snippet with framework-correct patterns. Never guesses.
 */

export function handleRemixOrNuxt(ctx, tagDefinitions = {}) {
  if (ctx.framework === "remix") {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: ${JSON.stringify(tagDefinitions.title || "Your Page Title")} },
    { name: "description", content: ${JSON.stringify(tagDefinitions.description || "Your Page Description")} },
    { property: "og:title", content: ${JSON.stringify(tagDefinitions.openGraph?.title || "Your Page Title")} },
    { name: "twitter:card", content: "summary_large_image" },
  ];
};`,
      changes: [],
      placeholders: [],
      confidence: "medium",
      reason: "Remix manages page metadata via the MetaFunction export in route files.",
    };
  }

  if (ctx.framework === "nuxt") {
    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `// Inside your Nuxt page or app.vue:
useSeoMeta({
  title: ${JSON.stringify(tagDefinitions.title || "Your Page Title")},
  description: ${JSON.stringify(tagDefinitions.description || "Your Page Description")},
  ogTitle: ${JSON.stringify(tagDefinitions.openGraph?.title || "Your Page Title")},
  ogDescription: ${JSON.stringify(tagDefinitions.openGraph?.description || "Your Page Description")},
  twitterCard: 'summary_large_image',
});`,
      changes: [],
      placeholders: [],
      confidence: "medium",
      reason: "Nuxt manages page metadata via useSeoMeta() or useHead() composables.",
    };
  }

  return {
    status: "manual",
    patchedContent: null,
    manualSnippet: `<!-- Add to your HTML <head>: -->
<title>${tagDefinitions.title || "Your Page Title"}</title>
<meta name="description" content="${tagDefinitions.description || "Your Description"}" />
<link rel="canonical" href="${tagDefinitions.canonical || "https://example.com"}" />`,
    changes: [],
    placeholders: [],
    confidence: "low",
    reason: "Unrecognized framework architecture. Recommended manual snippet provided.",
  };
}
