import { resolveLang } from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";

export default {
  id: "htmlLang",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-html-lang" || id.startsWith("missing-html-lang-");
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro"].includes(framework);
  },
  apply(ctx, workingContent) {
    const lang = resolveLang(ctx);

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, {}, null, lang);
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, { lang });
    }

    if (ctx.framework === "nextjs-pages") {
      return patchNextPagesRouter(ctx, workingContent, [], lang);
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
