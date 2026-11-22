import {
  resolveTitle,
  resolveMetaDescription,
  resolveSocialImage,
  resolveCanonicalUrl,
  resolveSiteName,
} from "../valueResolver.js";
import { patchNextAppRouterLayout } from "../frameworks/nextAppRouter.js";
import { patchReactViteHtml } from "../frameworks/reactVite.js";
import { patchAstroLayout } from "../frameworks/astro.js";
import { patchNextPagesRouter } from "../frameworks/nextPagesRouter.js";
import { handleRemixOrNuxt } from "../frameworks/remixNuxt.js";

export default {
  id: "openGraph",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return (
      id === "missing-og-title" ||
      id === "missing-og-description" ||
      id === "missing-og-image" ||
      id === "relative-og-image"
    );
  },
  supports(framework) {
    return ["nextjs-app", "nextjs-pages", "react-vite", "astro", "remix", "nuxt"].includes(
      framework
    );
  },
  apply(ctx, workingContent) {
    const title = resolveTitle(ctx).value;
    const description = resolveMetaDescription(ctx).value;
    const url = resolveCanonicalUrl(ctx);
    const siteName = resolveSiteName(ctx);
    const socialImage = resolveSocialImage(ctx);

    const ogObj = {
      title,
      description,
      url,
      siteName,
      type: "website",
    };

    if (socialImage.value) {
      ogObj.images = [{ url: socialImage.value, width: 1200, height: 630, alt: title }];
    }

    if (ctx.framework === "nextjs-app") {
      const metadataPayload = { openGraph: ogObj };
      // Set metadataBase if siteUrl exists
      if (ctx.siteUrl && !workingContent.includes("metadataBase")) {
        try {
          metadataPayload.metadataBase = new URL(ctx.siteUrl).origin;
        } catch {
          // ignore invalid url
        }
      }
      return patchNextAppRouterLayout(ctx, workingContent, metadataPayload);
    }

    if (ctx.framework === "react-vite") {
      return patchReactViteHtml(ctx, workingContent, {
        openGraph: {
          title,
          description,
          url,
          siteName,
          image: socialImage.value,
        },
      });
    }

    if (ctx.framework === "astro") {
      return patchAstroLayout(ctx, workingContent, {
        openGraph: { title, description },
      });
    }

    if (ctx.framework === "nextjs-pages") {
      const headNodes = [
        { tag: "meta", props: { property: "og:title", content: title } },
        { tag: "meta", props: { property: "og:description", content: description } },
        { tag: "meta", props: { property: "og:url", content: url } },
        { tag: "meta", props: { property: "og:site_name", content: siteName } },
      ];
      if (socialImage.value) {
        headNodes.push({ tag: "meta", props: { property: "og:image", content: socialImage.value } });
      }
      return patchNextPagesRouter(ctx, workingContent, headNodes);
    }

    return handleRemixOrNuxt(ctx, { openGraph: ogObj });
  },
};
