import { resolveTitle } from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchAstroLayout } from "../frameworks/astro.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";
import { handleRemixOrNuxt } from "../frameworks/remixNuxt.js";

export default {
  id: "title",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return (
      id === "missing-title" ||
      id.startsWith("missing-title-") ||
      id.startsWith("short-title-") ||
      id.startsWith("long-title-") ||
      id.startsWith("duplicate-title-")
    );
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro", "remix", "nuxt"].includes(
      framework
    );
  },
  apply(ctx, workingContent) {
    const { value, placeholder, confidence } = resolveTitle(ctx);

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, { title: value });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, { title: value });
    }

    if (ctx.framework === "astro") {
      return patchAstroLayout(ctx, workingContent, { title: value });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [
        { tag: "title", props: {}, children: value },
      ]);
    }

    return handleRemixOrNuxt(ctx, { title: value });
  },
};
