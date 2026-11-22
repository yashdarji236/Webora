import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";

export default {
  id: "charset",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-charset" || id.startsWith("missing-charset-");
  },
  supports(framework) {
    return ["react-vite", "nextjs-pages", "astro"].includes(framework);
  },
  apply(ctx, workingContent) {
    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, { charset: "UTF-8" });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [
        { tag: "meta", props: { charSet: "utf-8" } },
      ]);
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
