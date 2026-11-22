import { resolveSiteName } from "../valueResolver.js";
import { insertIntoHead } from "../parsers/htmlParser.js";

export default {
  id: "jsonLd",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-schema-homepage" || id.startsWith("invalid-jsonld-syntax-");
  },
  supports(framework) {
    return true;
  },
  apply(ctx, workingContent) {
    const name = resolveSiteName(ctx);
    const url = ctx.siteUrl;

    const schemaObj = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${url}/#website`,
          url: url,
          name: name,
        },
        {
          "@type": "Organization",
          "@id": `${url}/#organization`,
          name: name,
          url: url,
        },
      ],
    };

    const jsonString = JSON.stringify(schemaObj, null, 2);

    if (ctx.framework === "nextjs-app") {
      // In Next.js App Router, inject script in layout or return snippet
      const snippet = `<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(${JSON.stringify(schemaObj)}),
  }}
/>`;
      return {
        status: "manual",
        patchedContent: null,
        manualSnippet: snippet,
        changes: [],
        placeholders: [],
        confidence: "medium",
        reason: "Next.js recommends inserting JSON-LD via a <script type='application/ld+json'> in your root layout or page.",
      };
    }

    if (ctx.framework === "react-vite") {
      const scriptTag = `<script type="application/ld+json">\n${jsonString}\n    </script>`;
      const patched = insertIntoHead(workingContent, scriptTag);
      return {
        status: "applied",
        patchedContent: patched,
        manualSnippet: null,
        changes: [
          {
            description: "Injected WebSite and Organization JSON-LD structured data.",
            reason: "Enables Google Rich Results and Knowledge Graph indexing.",
          },
        ],
        placeholders: [],
        confidence: "high",
      };
    }

    return {
      status: "manual",
      patchedContent: null,
      manualSnippet: `<script type="application/ld+json">\n${jsonString}\n</script>`,
      changes: [],
      placeholders: [],
      confidence: "medium",
      reason: "Insert this JSON-LD script inside your layout or homepage <head>.",
    };
  },
};
