import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Globe,
  Layers,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  Search,
  Wrench,
  AlertCircle,
  FileCode,
} from "lucide-react";

/* ─── CIRCULAR SCORE RING COMPONENT ──────────────────────────────── */
const CircularScoreRing = ({ score = 0, grade = "F" }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return "#10B981"; // emerald
    if (s >= 75) return "#F59E0B"; // amber
    return "#F43F5E"; // rose
  };

  const color = getColor(score);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#1F1F26"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold text-white tracking-tight leading-none">
          {score}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-wider mt-0.5"
          style={{ color }}
        >
          Grade {grade}
        </span>
      </div>
    </div>
  );
};

/* ─── SEVERITY BADGE COMPONENT ───────────────────────────────────── */
const SeverityBadge = ({ severity }) => {
  switch (severity) {
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <ShieldAlert size={12} className="shrink-0" />
          <span>Critical</span>
        </span>
      );
    case "high":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <AlertTriangle size={12} className="shrink-0" />
          <span>High</span>
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertCircle size={12} className="shrink-0" />
          <span>Medium</span>
        </span>
      );
    case "low":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <Info size={12} className="shrink-0" />
          <span>Low</span>
        </span>
      );
  }
};

/* ─── MAIN SEO AUDIT REPORT COMPONENT ────────────────────────────── */
export const SeoAuditReport = ({
  repoName = "",
  detectedUrl = "",
  auditData,
  isLoadingAudit = false,
  isRunningAudit,
  auditStep = 1,
  auditError = null,
  onRunAudit,
  onUpdateUrl,
  onContinueToPreviews,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [inlineUrl, setInlineUrl] = useState("");

  const audit = auditData?.audit || {};
  const categories = auditData?.categories || {};
  const crawl = auditData?.crawl || {};
  const issues = auditData?.issues || [];
  const performance = auditData?.performance || {};
  const websiteUrl = auditData?.websiteUrl || "";

  // Progress Steps Definition (12 real steps)
  const auditSteps = [
    { num: 1, title: "Validating target website URL & SSRF security" },
    { num: 2, title: "Connecting to server & verifying HTTP status" },
    { num: 3, title: "Inspecting robots.txt & XML sitemap availability" },
    { num: 4, title: "Discovering and queuing internal page routes" },
    { num: 5, title: "Crawling HTML pages & extracting title/meta tags" },
    { num: 6, title: "Analyzing technical SEO, canonicals & indexability" },
    { num: 7, title: "Verifying OpenGraph & Twitter/X card metadata" },
    { num: 8, title: "Inspecting heading structure, H1 count & image alts" },
    { num: 9, title: "Validating JSON-LD & Schema.org structured data" },
    { num: 10, title: "Evaluating server latency & performance metrics" },
    { num: 11, title: "Calculating deterministic 100-point SEO score" },
    { num: 12, title: "Saving audit report to database" },
  ];

  // Category summary mapping
  const categoryList = [
    {
      key: "basicSeo",
      title: "Basic SEO",
      desc: "Title tags, meta descriptions, canonicals, viewport",
      data: categories.basicSeo || { score: 25, maxScore: 25 },
      icon: Globe,
    },
    {
      key: "technicalSeo",
      title: "Technical SEO",
      desc: "HTTPS, robots.txt, sitemaps, indexability, broken links",
      data: categories.technicalSeo || { score: 25, maxScore: 25 },
      icon: Wrench,
    },
    {
      key: "socialMetadata",
      title: "Social Metadata",
      desc: "OpenGraph tags, Twitter cards, social preview images",
      data: categories.socialMetadata || { score: 15, maxScore: 15 },
      icon: Sparkles,
    },
    {
      key: "contentSeo",
      title: "Content SEO",
      desc: "Heading hierarchy (H1-H3), image alt text, thin content",
      data: categories.contentSeo || { score: 15, maxScore: 15 },
      icon: Layers,
    },
    {
      key: "structuredData",
      title: "Structured Data",
      desc: "JSON-LD schema syntax, organization, website entities",
      data: categories.structuredData || { score: 10, maxScore: 10 },
      icon: FileCode,
    },
    {
      key: "performance",
      title: "Performance & Mobile",
      desc: "Server latency (TTFB), asset payloads, responsive design",
      data: categories.performance || { score: 10, maxScore: 10 },
      icon: Zap,
    },
  ];

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (selectedSeverity !== "all") {
      if (selectedSeverity === "autoFixable") {
        if (!issue.autoFixable) return false;
      } else if (issue.severity !== selectedSeverity) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCustomUrlSubmit = (e) => {
    e.preventDefault();
    if (customUrlInput.trim() && onUpdateUrl) {
      onUpdateUrl(customUrlInput.trim());
      setShowUrlModal(false);
      setCustomUrlInput("");
    }
  };

  if (isLoadingAudit && !auditData && !isRunningAudit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 select-none">
        <div className="text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-neutral-400 mx-auto" />
          <p className="text-xs font-mono text-neutral-400">
            Loading audit results for {repoName || "repository"}...
          </p>
        </div>
      </div>
    );
  }

  if (!auditData && !isRunningAudit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-lg p-8 rounded-2xl border border-[#22222A] bg-[#121216] text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-neutral-800 flex items-center justify-center text-rose-400">
            <Globe size={26} strokeWidth={1.7} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              {repoName || "Repository Audit"}
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              No SEO Audit Loaded
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
              Run a live crawl for{" "}
              <code className="text-neutral-200 font-mono">{repoName || "this repository"}</code>{" "}
              to inspect technical SEO, metadata, OpenGraph tags, and calculate a real SEO score.
            </p>
          </div>

          {auditError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-left flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">{auditError}</p>
                <p className="text-[11px] text-rose-300/80">
                  Enter a valid public deployed URL below to run the audit.
                </p>
              </div>
            </div>
          )}

          <div className="text-left space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
              Deployed Website URL {detectedUrl ? "(Auto-detected)" : "(Optional or Custom URL)"}
            </label>
            <input
              type="text"
              placeholder={detectedUrl || "https://your-deployed-site.com"}
              value={inlineUrl}
              onChange={(e) => setInlineUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0D] border border-[#22222A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono"
            />
          </div>

          <div className="pt-1 flex items-center justify-center">
            <button
              onClick={() => {
                const chosen = inlineUrl.trim();
                if (chosen && onUpdateUrl) {
                  onUpdateUrl(chosen);
                } else if (onRunAudit) {
                  onRunAudit();
                }
              }}
              className="px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-white hover:bg-neutral-200 transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Start SEO Audit</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* ─── ERROR BANNER (If re-audit failed while previous audit shown) ─── */}
      {auditError && !isRunningAudit && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{auditError}</span>
          </div>
          <button
            onClick={() => setShowUrlModal(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold shrink-0 cursor-pointer"
          >
            Update URL
          </button>
        </div>
      )}

      {/* ─── PROGRESS SCANNER (When isRunningAudit is true) ───────────── */}
      {isRunningAudit && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-[#121216] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 animate-pulse" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="animate-spin text-rose-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Crawling Live Website & Analyzing SEO
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Stage {auditStep} of 12
            </span>
          </div>

          <div className="space-y-2">
            {auditSteps.map((step) => {
              const isDone = auditStep > step.num;
              const isCurrent = auditStep === step.num;

              return (
                <div
                  key={step.num}
                  className={`flex items-center gap-3 text-xs font-mono transition-colors ${
                    isDone
                      ? "text-emerald-400"
                      : isCurrent
                      ? "text-white font-semibold"
                      : "text-neutral-500 opacity-60"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[11px]">
                    {isDone ? (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    ) : (
                      <span>{step.num}</span>
                    )}
                  </div>
                  <span>{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {auditData && (
        <>
          {/* ─── SECTION A: SEO HEALTH OVERVIEW ─────────────────────────── */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[#22222A] bg-[#121216] relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <CircularScoreRing score={audit.overallScore ?? 0} grade={audit.grade || "F"} />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Target Website
                </span>
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:underline"
                  >
                    <span>{websiteUrl}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                SEO Health Score: {audit.overallScore ?? 0}/100
              </h2>

              <p className="text-xs text-neutral-400 max-w-xl">
                {audit.overallScore >= 90
                  ? "Outstanding SEO health! Your technical foundation, metadata, and social previews match Google and search engine guidelines."
                  : audit.overallScore >= 75
                  ? "Good foundation with several high-impact opportunities to optimize metadata, headings, and discoverability."
                  : "Critical SEO issues detected. Missing meta descriptions, social cards, or technical tags are hurting your search visibility."}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUrlModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer border border-neutral-700"
            >
              Change URL
            </button>

            <button
              onClick={onRunAudit}
              disabled={isRunningAudit}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRunningAudit ? "animate-spin" : ""} />
              <span>{isRunningAudit ? "Crawling..." : "Re-crawl Website"}</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Pill Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-[#1E1E23]">
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <span className="text-[11px] font-mono text-neutral-400 block">Total Issues</span>
            <span className="text-xl font-extrabold text-white">{issues.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <span className="text-[11px] font-mono text-rose-400 block">Critical</span>
            <span className="text-xl font-extrabold text-rose-400">{audit.criticalIssues || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <span className="text-[11px] font-mono text-amber-400 block">High & Medium</span>
            <span className="text-xl font-extrabold text-amber-400">
              {(audit.highIssues || 0) + (audit.mediumIssues || 0)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[11px] font-mono text-emerald-400 block">Auto-Fixable</span>
            <span className="text-xl font-extrabold text-emerald-400">{audit.autoFixableIssues || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <span className="text-[11px] font-mono text-neutral-400 block">Pages Crawled</span>
            <span className="text-xl font-extrabold text-white">{crawl.pagesScanned || 0}</span>
          </div>
        </div>
      </div>

      {/* ─── SECTION B: CATEGORY BREAKDOWN CARDS ─────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          SEO Category Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryList.map((cat) => {
            const IconComp = cat.icon;
            const score = cat.data.score ?? cat.data.maxScore;
            const max = cat.data.maxScore || 25;
            const pct = Math.round((score / max) * 100);

            return (
              <div
                key={cat.key}
                className="p-5 rounded-xl border border-[#22222A] bg-[#121216] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComp size={16} className="text-rose-400 shrink-0" />
                    <span className="text-sm font-bold text-white">{cat.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-300">
                    {score}/{max} pts
                  </span>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed min-h-[32px]">
                  {cat.desc}
                </p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 85
                          ? "bg-emerald-400"
                          : pct >= 65
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>Health</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION C: ISSUES DASHBOARD ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-rose-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Detected Issues ({filteredIssues.length})
            </h3>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedSeverity("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSeverity === "all"
                ? "bg-white text-black"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setSelectedSeverity("critical")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSeverity === "critical"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-rose-400"
            }`}
          >
            Critical ({issues.filter((i) => i.severity === "critical").length})
          </button>
          <button
            onClick={() => setSelectedSeverity("high")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSeverity === "high"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-orange-400"
            }`}
          >
            High ({issues.filter((i) => i.severity === "high").length})
          </button>
          <button
            onClick={() => setSelectedSeverity("medium")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSeverity === "medium"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-amber-400"
            }`}
          >
            Medium ({issues.filter((i) => i.severity === "medium").length})
          </button>
          <button
            onClick={() => setSelectedSeverity("autoFixable")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSeverity === "autoFixable"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-emerald-400"
            }`}
          >
            Auto-Fixable ({issues.filter((i) => i.autoFixable).length})
          </button>
        </div>

        {/* Issues List */}
        {filteredIssues.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[#22222A] bg-[#121216] text-center space-y-2">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">No matching issues found</h4>
            <p className="text-xs text-neutral-400">
              No issues in this filter category. Your site passes all evaluated checks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id;

              return (
                <div
                  key={issue.id}
                  className="rounded-xl border border-[#22222A] bg-[#121216] hover:border-neutral-700 transition-all overflow-hidden"
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SeverityBadge severity={issue.severity} />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white tracking-tight truncate">
                          {issue.title}
                        </h4>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {issue.category} · {issue.affectedUrls?.length || 1} page(s)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {issue.autoFixable && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Wrench size={10} />
                          Auto-Fixable
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-neutral-400" />
                      ) : (
                        <ChevronRight size={16} className="text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-neutral-800/80 bg-neutral-900/40 space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                          Explanation
                        </span>
                        <p className="text-neutral-300 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block mb-1">
                            SEO Impact
                          </span>
                          <p className="text-neutral-400 leading-relaxed">
                            {issue.impact}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                            Recommended Solution
                          </span>
                          <p className="text-neutral-400 leading-relaxed">
                            {issue.recommendation}
                          </p>
                        </div>
                      </div>

                      {issue.evidence && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                            Technical Evidence
                          </span>
                          <div className="p-2.5 rounded bg-black/40 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                            <code>{issue.evidence}</code>
                          </div>
                        </div>
                      )}

                      {issue.affectedUrls && issue.affectedUrls.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                            Affected URLs ({issue.affectedUrls.length})
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar font-mono text-[11px]">
                            {issue.affectedUrls.map((url, uIdx) => (
                              <a
                                key={uIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-neutral-400 hover:text-white truncate"
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION D: CRAWL OVERVIEW ───────────────────────────────── */}
      <div className="p-6 rounded-2xl border border-[#22222A] bg-[#121216] space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Crawl Diagnostics & Technical Assets
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-500 block">Crawl Duration</span>
            <span className="text-white font-bold">
              {crawl.durationMs ? `${(crawl.durationMs / 1000).toFixed(1)}s` : "0s"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-500 block">Server Latency</span>
            <span className="text-white font-bold">
              {performance.serverLatencyMs ? `${performance.serverLatencyMs}ms` : "Normal"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-500 block">Robots.txt</span>
            <span className={crawl.robots?.exists ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {crawl.robots?.exists ? "Detected" : "Missing"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-500 block">XML Sitemap</span>
            <span className={crawl.sitemap?.exists ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {crawl.sitemap?.exists ? `${crawl.sitemap.totalUrls} URLs` : "Missing"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-500 block">Broken Links</span>
            <span className={crawl.brokenLinks?.length > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {crawl.brokenLinks?.length || 0} broken
            </span>
          </div>
        </div>
      </div>

      {/* ─── SECTION E: PRIMARY AUDIT ACTION (FEATURE 3 TRANSITION) ──── */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-gradient-to-r from-[#121216] via-[#16161D] to-[#121216] flex items-center justify-between flex-wrap gap-4 shadow-xl">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white tracking-tight">
            SEO Audit Completed.
          </h4>
          <p className="text-xs text-neutral-400 max-w-xl">
            Audit results and technical recommendations have been recorded in MongoDB. Continue to preview your live search & social snippets.
          </p>
        </div>

        <button
          onClick={onContinueToPreviews}
          className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-white hover:bg-neutral-200 transition-all active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Social Previews</span>
          <ArrowRight size={16} />
        </button>
      </div>
        </>
      )}

      {/* ─── MODAL: MANUAL URL VERIFICATION DIALOG ────────────────────── */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#141418] border border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Enter Target Deployed URL
              </h3>
              <button
                onClick={() => setShowUrlModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Provide the live production or staging URL for this repository to run an authentic crawl.
            </p>

            <form onSubmit={handleCustomUrlSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customUrlInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
                >
                  Verify & Crawl
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
