import { patchNextAppRouterLayout, isNext14Plus } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";

export default {
  id: "viewport",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-viewport" || id.startsWith("missing-viewport-");
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro"].includes(framework);
  },
  apply(ctx, workingContent) {
    if (ctx.framework === "nextjs-app") {
      const isNext14 = isNext14Plus(ctx.frameworkVersion);
      if (isNext14) {
        return patchNextAppRouterLayout(
          ctx,
          workingContent,
          {},
          { width: "device-width", initialScale: 1 }
        );
      }
      return patchNextAppRouterLayout(ctx, workingContent, {
        viewport: "width=device-width, initial-scale=1",
      });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, {
        viewport: "width=device-width, initial-scale=1.0",
      });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [
        {
          tag: "meta",
          props: { name: "viewport", content: "width=device-width, initial-scale=1.0" },
        },
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
