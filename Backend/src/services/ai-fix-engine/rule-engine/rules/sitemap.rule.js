export default {
  id: "sitemap",
  handlesIssues(issueId = "") {
    const id = issueId.toLowerCase();
    return id === "missing-sitemap-xml" || id === "empty-sitemap-xml";
  },
  supports(framework) {
    return true;
  },
  apply(ctx, workingContent) {
    const baseUrl = ctx.siteUrl.replace(/\/$/, "");

    if (ctx.framework === "nextjs-app") {
      const isTs = ctx.usesTypeScript || ctx.filePath.endsWith(".ts");
      const code = isTs
        ? `import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: '${baseUrl}',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}
`
        : `export default function sitemap() {
  return [
    {
      url: '${baseUrl}',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}
`;

      return {
        status: "applied",
        patchedContent: code,
        manualSnippet: null,
        changes: [
          {
            description: "Generated Next.js App Router sitemap (app/sitemap.ts).",
            reason: "Declares indexed routes and crawl frequencies using Next.js MetadataRoute.",
          },
        ],
        placeholders: [],
        confidence: "high",
      };
    }

    // Static XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

    return {
      status: "applied",
      patchedContent: xml,
      manualSnippet: null,
      changes: [
        {
          description: "Generated standard public/sitemap.xml file.",
          reason: "Enables search engines to discover and crawl site routes.",
        },
      ],
      placeholders: [],
      confidence: "high",
    };
  },
};
