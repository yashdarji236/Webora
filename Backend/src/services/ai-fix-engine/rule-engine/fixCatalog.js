import titleRule from "./rules/title.rule.js";
import metaDescriptionRule from "./rules/metaDescription.rule.js";
import canonicalRule from "./rules/canonical.rule.js";
import viewportRule from "./rules/viewport.rule.js";
import htmlLangRule from "./rules/htmlLang.rule.js";
import charsetRule from "./rules/charset.rule.js";
import faviconRule from "./rules/favicon.rule.js";
import openGraphRule from "./rules/openGraph.rule.js";
import twitterCardRule from "./rules/twitterCard.rule.js";
import robotsRule from "./rules/robots.rule.js";
import sitemapRule from "./rules/sitemap.rule.js";
import jsonLdRule from "./rules/jsonLd.rule.js";

export const ALL_RULES = [
  titleRule,
  metaDescriptionRule,
  canonicalRule,
  viewportRule,
  htmlLangRule,
  charsetRule,
  faviconRule,
  openGraphRule,
  twitterCardRule,
  robotsRule,
  sitemapRule,
  jsonLdRule,
];

/**
 * Finds all rules applicable to a given issue ID.
 * @param {string} issueId
 * @returns {Array} List of matching rule objects
 */
export function getRulesForIssue(issueId) {
  if (!issueId) return [];
  return ALL_RULES.filter((rule) => rule.handlesIssues(issueId));
}

/**
 * Finds the rule object by its unique rule ID.
 * @param {string} ruleId
 * @returns {Object|null}
 */
export function getRuleById(ruleId) {
  return ALL_RULES.find((r) => r.id === ruleId) || null;
}
