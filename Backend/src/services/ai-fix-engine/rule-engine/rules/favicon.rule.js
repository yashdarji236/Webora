import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";

export default {
  id: "favicon",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-favicon" || id.startsWith("missing-favicon-");
  },
  supports(framework) {
    return ["nextjs-app", "react-vite", "astro"].includes(framework);
  },
  apply(ctx, workingContent) {
    const hasFaviconInTree =
      ctx.crawl?.favicon ||
      (ctx.filePath && ctx.filePath.includes("favicon")) ||
      ctx.originalContent.includes("favicon");

    if (!hasFaviconInTree) {
      return {
        status: "manual",
        patchedContent: null,
        manualSnippet: `<!-- Place a favicon.ico or favicon.svg in your public/ or app/ directory -->
<link rel="icon" href="/favicon.ico" sizes="any" />`,
        changes: [],
        placeholders: [],
        confidence: "medium",
        reason: "No favicon file was discovered in the repository tree. Add a favicon to public/ or app/ directory.",
      };
    }

    const faviconPath = ctx.crawl?.favicon || "/favicon.ico";

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, {
        icons: { icon: faviconPath },
      });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, {
        favicon: faviconPath,
      });
    }

    return {
      status: "noop",
      patchedContent: workingContent,
      manualSnippet: null,
      changes: [],
      placeholders: [],
      confidence: "high",
    };
  },
};
