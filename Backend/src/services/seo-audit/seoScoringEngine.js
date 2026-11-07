/**
 * Deterministic SEO Scoring Engine
 * Computes category-specific scores and overall 0-100 SEO health score based on real issue deductions.
 */

const CATEGORY_WEIGHTS = {
  basicSeo: { name: "Basic SEO", max: 25 },
  technicalSeo: { name: "Technical SEO", max: 25 },
  socialMetadata: { name: "Social Metadata", max: 15 },
  contentSeo: { name: "Content SEO", max: 15 },
  structuredData: { name: "Structured Data", max: 10 },
  performance: { name: "Performance & Mobile", max: 10 },
};

const SEVERITY_PENALTIES = {
  critical: 9,
  high: 5,
  medium: 3,
  low: 1,
  informational: 0,
};

/**
 * Calculate SEO Health Score and grade from detected issues
 * @param {Array<object>} allIssues
 */
export function calculateSeoScore(allIssues = []) {
  // Initialize category points at maximum
  const categoryScores = {
    basicSeo: { score: CATEGORY_WEIGHTS.basicSeo.max, maxScore: CATEGORY_WEIGHTS.basicSeo.max, issuesCount: 0 },
    technicalSeo: { score: CATEGORY_WEIGHTS.technicalSeo.max, maxScore: CATEGORY_WEIGHTS.technicalSeo.max, issuesCount: 0 },
    socialMetadata: { score: CATEGORY_WEIGHTS.socialMetadata.max, maxScore: CATEGORY_WEIGHTS.socialMetadata.max, issuesCount: 0 },
    contentSeo: { score: CATEGORY_WEIGHTS.contentSeo.max, maxScore: CATEGORY_WEIGHTS.contentSeo.max, issuesCount: 0 },
    structuredData: { score: CATEGORY_WEIGHTS.structuredData.max, maxScore: CATEGORY_WEIGHTS.structuredData.max, issuesCount: 0 },
    performance: { score: CATEGORY_WEIGHTS.performance.max, maxScore: CATEGORY_WEIGHTS.performance.max, issuesCount: 0 },
  };

  for (const issue of allIssues) {
    const penalty = SEVERITY_PENALTIES[issue.severity] || 1;

    switch (issue.category) {
      case "Basic SEO":
        categoryScores.basicSeo.score = Math.max(0, categoryScores.basicSeo.score - penalty);
        categoryScores.basicSeo.issuesCount++;
        break;
      case "Technical SEO":
        categoryScores.technicalSeo.score = Math.max(0, categoryScores.technicalSeo.score - penalty);
        categoryScores.technicalSeo.issuesCount++;
        break;
      case "Social Metadata":
        categoryScores.socialMetadata.score = Math.max(0, categoryScores.socialMetadata.score - penalty);
        categoryScores.socialMetadata.issuesCount++;
        break;
      case "Content SEO":
        categoryScores.contentSeo.score = Math.max(0, categoryScores.contentSeo.score - penalty);
        categoryScores.contentSeo.issuesCount++;
        break;
      case "Structured Data":
        categoryScores.structuredData.score = Math.max(0, categoryScores.structuredData.score - penalty);
        categoryScores.structuredData.issuesCount++;
        break;
      case "Performance & Mobile":
        categoryScores.performance.score = Math.max(0, categoryScores.performance.score - penalty);
        categoryScores.performance.issuesCount++;
        break;
    }
  }

  // Calculate overall score (0 to 100)
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      categoryScores.basicSeo.score +
        categoryScores.technicalSeo.score +
        categoryScores.socialMetadata.score +
        categoryScores.contentSeo.score +
        categoryScores.structuredData.score +
        categoryScores.performance.score
    )
  );

  // Grade mapping
  let grade = "F";
  if (overallScore >= 95) grade = "A+";
  else if (overallScore >= 90) grade = "A";
  else if (overallScore >= 80) grade = "B";
  else if (overallScore >= 70) grade = "C";
  else if (overallScore >= 60) grade = "D";

  // Tally issue severities
  const counts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
    autoFixable: allIssues.filter((i) => i.autoFixable).length,
  };

  return {
    overallScore,
    grade,
    categories: categoryScores,
    counts,
  };
}

