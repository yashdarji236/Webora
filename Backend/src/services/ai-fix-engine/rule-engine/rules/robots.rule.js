export default {
  id: "robots",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return (
      id === "missing-robots-txt" ||
      id === "robots-blocks-entire-site" ||
      id === "robots-missing-sitemap-directive"
    );
  },
  supports(framework) {
    return true;
  },
  apply(ctx, workingContent) {
    const sitemapUrl = `${ctx.siteUrl.replace(/\/$/, "")}/sitemap.xml`;

    if (ctx.framework === "nextjs-app") {
      const isTs = ctx.usesTypeScript || ctx.filePath.endsWith(".ts");
      const code = isTs
        ? `import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/',
    },
    sitemap: '${sitemapUrl}',
  };
}
`
        : `export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/',
    },
    sitemap: '${sitemapUrl}',
  };
}
`;

      return {
        status: "applied",
        patchedContent: code,
        manualSnippet: null,
        changes: [
          {
            description: "Generated Next.js App Router robots configuration (app/robots.ts).",
            reason: "Declares search bot access rules and sitemap location using Next.js MetadataRoute.",
          },
        ],
        placeholders: [],
        confidence: "high",
      };
    }

    // Static public/robots.txt
    const txt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

    return {
      status: "applied",
      patchedContent: txt,
      manualSnippet: null,
      changes: [
        {
          description: "Generated standard public/robots.txt file.",
          reason: "Enables search engine indexing and declares XML sitemap location.",
        },
      ],
      placeholders: [],
      confidence: "high",
    };
  },
};
