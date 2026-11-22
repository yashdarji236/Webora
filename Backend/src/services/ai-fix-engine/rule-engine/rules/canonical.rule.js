import { resolveCanonicalUrl } from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchAstroLayout } from "../frameworks/astro.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";
import { handleRemixOrNuxt } from "../frameworks/remixNuxt.js";

export default {
  id: "canonical",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return (
      id === "missing-canonical" ||
      id.startsWith("missing-canonical-") ||
      id.startsWith("relative-canonical-")
    );
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro", "remix", "nuxt"].includes(
      framework
    );
  },
  apply(ctx, workingContent) {
    const canonical = resolveCanonicalUrl(ctx);

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, {
        alternates: { canonical },
      });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, { canonical });
    }

    if (ctx.framework === "astro") {
      return patchAstroLayout(ctx, workingContent, { canonical });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [
        { tag: "link", props: { rel: "canonical", href: canonical } },
      ]);
    }

    return handleRemixOrNuxt(ctx, { canonical });
  },
};
