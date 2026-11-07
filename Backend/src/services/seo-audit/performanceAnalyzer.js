/**
 * Performance & Mobile Analyzer
 * Evaluates real PageSpeed Insights Core Web Vitals (when API key is present)
 * or real lab response time and asset diagnostics with clear labeling.
 */

export async function analyzePerformance(crawlData) {
  const issues = [];
  const homepage = crawlData.pages[0];

  if (!homepage) {
    return {
      performanceScore: null,
      source: "unavailable",
      metrics: {},
      issues: [],
    };
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  let pageSpeedMetrics = null;

  // Try Google PageSpeed Insights API if key is available
  if (apiKey && homepage.url.startsWith("http")) {
    try {
      const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        homepage.url
      )}&key=${apiKey}&strategy=mobile`;

      const psiRes = await fetch(psiUrl, { signal: AbortSignal.timeout(12000) });
      if (psiRes.ok) {
        const psiData = await psiRes.json();
        const lighthouse = psiData.lighthouseResult;
        const categories = lighthouse?.categories;
        const audits = lighthouse?.audits;

        pageSpeedMetrics = {
          source: "google-pagespeed-insights",
          strategy: "mobile",
          performanceScore: Math.round((categories?.performance?.score || 0) * 100),
          accessibilityScore: Math.round((categories?.accessibility?.score || 0) * 100),
          bestPracticesScore: Math.round((categories?.["best-practices"]?.score || 0) * 100),
          seoScore: Math.round((categories?.seo?.score || 0) * 100),
          fcp: audits?.["first-contentful-paint"]?.displayValue || null,
          lcp: audits?.["largest-contentful-paint"]?.displayValue || null,
          cls: audits?.["cumulative-layout-shift"]?.displayValue || null,
          speedIndex: audits?.["speed-index"]?.displayValue || null,
        };

        if (pageSpeedMetrics.performanceScore < 50) {
          issues.push({
            id: "poor-mobile-performance",
            title: `Poor Mobile Performance Score (${pageSpeedMetrics.performanceScore}/100)`,
            category: "Performance & Mobile",
            severity: "high",
            affectedUrl: homepage.url,
            affectedUrls: [homepage.url],
            description: `Google PageSpeed reported a performance score of ${pageSpeedMetrics.performanceScore}/100.`,
            impact: "Slow loading speeds directly degrade Google rankings and reduce user conversions.",
            recommendation: "Optimize LCP images, reduce render-blocking JavaScript, and enable edge caching.",
            autoFixable: false,
            source: "pagespeed-api",
            evidence: `LCP: ${pageSpeedMetrics.lcp}, FCP: ${pageSpeedMetrics.fcp}, CLS: ${pageSpeedMetrics.cls}`,
          });
        }
      }
    } catch (err) {
      console.warn("PageSpeed Insights request failed, using lab diagnostics:", err.message);
    }
  }

  // Fallback Lab Diagnostics (Response times and asset sizes)
  if (!pageSpeedMetrics) {
    const avgResponseTime = Math.round(
      crawlData.pages.reduce((acc, p) => acc + (p.responseTimeMs || 0), 0) / (crawlData.pages.length || 1)
    );

    pageSpeedMetrics = {
      source: "lab-diagnostic-fallback",
      serverLatencyMs: homepage.responseTimeMs,
      averageResponseTimeMs: avgResponseTime,
      totalPagesMeasured: crawlData.pages.length,
      viewportConfigured: Boolean(homepage.viewport),
      note: "Field Core Web Vitals unavailable. Real server latency and asset measurements analyzed.",
    };

    // Server latency check
    if (homepage.responseTimeMs > 1800) {
      issues.push({
        id: "high-server-latency",
        title: `High Server Response Time (${homepage.responseTimeMs}ms)`,
        category: "Performance & Mobile",
        severity: "medium",
        affectedUrl: homepage.url,
        affectedUrls: [homepage.url],
        description: `Initial homepage response took ${homepage.responseTimeMs}ms (recommended: < 600ms).`,
        impact: "Slow TTFB delays crawler parsing and hurts Time to First Contentful Paint.",
        recommendation: "Use a global CDN, server-side caching, or optimize database queries on cold starts.",
        autoFixable: false,
        source: "crawler-latency",
        evidence: `Initial TTFB latency: ${homepage.responseTimeMs}ms`,
      });
    }
  }

  return {
    metrics: pageSpeedMetrics,
    issues,
  };
}

