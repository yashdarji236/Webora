import { resolveMetaDescription } from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchAstroLayout } from "../frameworks/astro.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";
import { handleRemixOrNuxt } from "../frameworks/remixNuxt.js";

export default {
  id: "metaDescription",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return (
      id === "missing-meta-description" ||
      id.startsWith("missing-meta-description-") ||
      id.startsWith("short-meta-description-") ||
      id.startsWith("long-meta-description-") ||
      id.startsWith("duplicate-description-")
    );
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro", "remix", "nuxt"].includes(
      framework
    );
  },
  apply(ctx, workingContent) {
    const { value, placeholder, confidence } = resolveMetaDescription(ctx);

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, { description: value });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, { description: value });
    }

    if (ctx.framework === "astro") {
      return patchAstroLayout(ctx, workingContent, { description: value });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [
        { tag: "meta", props: { name: "description", content: value } },
      ]);
    }

    return handleRemixOrNuxt(ctx, { description: value });
  },
};
