import {
  resolveTitle,
  resolveMetaDescription,
  resolveSocialImage,
} from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";

export default {
  id: "twitterCard",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-twitter-card" || id === "missing-twitter-image";
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro"].includes(framework);
  },
  apply(ctx, workingContent) {
    const title = resolveTitle(ctx).value;
    const description = resolveMetaDescription(ctx).value;
    const socialImage = resolveSocialImage(ctx);

    const cardType = socialImage.value ? "summary_large_image" : "summary";

    const twitterObj = {
      card: cardType,
      title,
      description,
    };
    if (socialImage.value) {
      twitterObj.images = [socialImage.value];
    }

    if (ctx.framework === "nextjs-app") {
      return patchNextAppRouterLayout(ctx, workingContent, { twitter: twitterObj });
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, {
        twitter: {
          card: cardType,
          title,
          image: socialImage.value,
        },
      });
    }

    if (ctx.framework === "nextjs-pages") {
      const headNodes = [
        { tag: "meta", props: { name: "twitter:card", content: cardType } },
        { tag: "meta", props: { name: "twitter:title", content: title } },
      ];
      if (socialImage.value) {
        headNodes.push({ tag: "meta", props: { name: "twitter:image", content: socialImage.value } });
      }
      return patchNextPagesRouter(ctx, workingContent, headNodes);
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
