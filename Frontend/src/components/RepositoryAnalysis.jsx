import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Server,
  FileSpreadsheet,
  Globe,
  Radio,
  FileSearch,
} from "lucide-react";

/* ─── STATUS BADGE COMPONENT ─────────────────────────────────────── */
const SeoStatusBadge = ({ status }) => {
  switch (status) {
    case "present":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>Present</span>
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle size={13} className="shrink-0" />
          <span>Partial</span>
        </span>
      );
    case "dynamic":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Sparkles size={13} className="shrink-0" />
          <span>Dynamic</span>
        </span>
      );
    case "unable-to-verify":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
          <Radio size={13} className="shrink-0" />
          <span>Unverified</span>
        </span>
      );
    case "missing":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle size={13} className="shrink-0" />
          <span>Missing</span>
        </span>
      );
  }
};

/* ─── COLLAPSIBLE DIRECTORY TREE NODE ────────────────────────────── */
const TreeNode = ({ node, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand first 2 levels

  if (!node) return null;

  const isDir = node.type === "dir";
  const hasChildren = isDir && Array.isArray(node.children) && node.children.length > 0;

  const getFileIcon = (fileName) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".json") || lower.endsWith(".config.ts") || lower.endsWith(".config.js")) {
      return <FileCheck size={14} className="text-amber-400 shrink-0" />;
    }
    if (lower.endsWith(".tsx") || lower.endsWith(".ts") || lower.endsWith(".jsx") || lower.endsWith(".js")) {
      return <FileCode size={14} className="text-sky-400 shrink-0" />;
    }
    if (lower.endsWith(".xml") || lower.endsWith(".txt")) {
      return <FileSpreadsheet size={14} className="text-emerald-400 shrink-0" />;
    }
    return <FileText size={14} className="text-neutral-400 shrink-0" />;
  };

  const isConfig =
    !isDir &&
    (/package\.json/i.test(node.name) ||
      /tsconfig/i.test(node.name) ||
      /\.config\./i.test(node.name) ||
      /vercel\.json/i.test(node.name) ||
      /robots\.txt/i.test(node.name) ||
      /sitemap/i.test(node.name));

  return (
    <div className="text-xs font-mono select-none">
      <div
        onClick={() => isDir && setIsOpen(!isOpen)}
        className={`flex items-center justify-between py-1 px-2 rounded-md transition-colors ${
          isDir ? "cursor-pointer hover:bg-neutral-800/60 text-neutral-200" : "text-neutral-400 hover:bg-neutral-800/30"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="flex items-center gap-2 truncate">
          {isDir ? (
            <>
              {hasChildren ? (
                isOpen ? <ChevronDown size={13} className="text-neutral-500 shrink-0" /> : <ChevronRight size={13} className="text-neutral-500 shrink-0" />
              ) : (
                <span className="w-3" />
              )}
              {isOpen ? <FolderOpen size={14} className="text-amber-400 shrink-0" /> : <Folder size={14} className="text-amber-400 shrink-0" />}
              <span className="font-semibold text-neutral-300 truncate">{node.name}/</span>
            </>
          ) : (
            <>
              <span className="w-3" />
              {getFileIcon(node.name)}
              <span className={`truncate ${isConfig ? "text-neutral-200 font-semibold" : ""}`}>
                {node.name}
              </span>
            </>
          )}
        </div>

        {isConfig && (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-amber-300 border border-neutral-700 shrink-0">
            config
          </span>
        )}
      </div>

      {isDir && isOpen && hasChildren && (
        <div className="border-l border-neutral-800 ml-3">
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.path}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── MAIN REPOSITORY ANALYSIS COMPONENT ─────────────────────────── */
export const RepositoryAnalysis = ({
  analysisData,
  isAnalyzing,
  currentStep,
  onReanalyze,
  onStartAudit,
}) => {
  const [activeTab, setActiveTab] = useState("all");

  const repo = analysisData?.repository || {};
  const framework = analysisData?.framework || {};
  const router = analysisData?.router || {};
  const structure = analysisData?.structure || {};
  const seoConfig = analysisData?.seoConfiguration || {};
  const deployment = analysisData?.deployment || {};
  const lastAnalyzed = analysisData?.analysis?.lastAnalyzedAt
    ? new Date(analysisData.analysis.lastAnalyzedAt).toLocaleString()
    : "Just now";

  // SEO Elements array for structured rendering
  const seoItems = [
    { key: "title", label: "Page Title", icon: FileText, ...seoConfig.title },
    { key: "description", label: "Meta Description", icon: FileText, ...seoConfig.description },
    { key: "openGraph", label: "OpenGraph Metadata", icon: Globe, ...seoConfig.openGraph },
    { key: "twitterCards", label: "Twitter Cards", icon: Globe, ...seoConfig.twitterCards },
    { key: "canonical", label: "Canonical URL", icon: FileCheck, ...seoConfig.canonical },
    { key: "robots", label: "Robots.txt", icon: FileSpreadsheet, ...seoConfig.robots },
    { key: "sitemap", label: "XML Sitemap", icon: FileSpreadsheet, ...seoConfig.sitemap },
    { key: "favicon", label: "Favicon & Icons", icon: Sparkles, ...seoConfig.favicon },
    { key: "structuredData", label: "Structured Data (JSON-LD)", icon: FileCode, ...seoConfig.structuredData },
    { key: "language", label: "HTML Lang Attribute", icon: Globe, ...seoConfig.language },
    { key: "viewport", label: "Mobile Viewport", icon: Radio, ...seoConfig.viewport },
  ];

  const presentCount = seoItems.filter((i) => i.status === "present" || i.status === "dynamic").length;
  const missingCount = seoItems.filter((i) => i.status === "missing").length;
  const partialCount = seoItems.filter((i) => i.status === "partial").length;

  const filteredSeoItems = seoItems.filter((item) => {
    if (activeTab === "present") return item.status === "present" || item.status === "dynamic";
    if (activeTab === "missing") return item.status === "missing";
    if (activeTab === "partial") return item.status === "partial";
    return true;
  });

  // Steps definition for progressive scan state
  const analysisSteps = [
    { number: 1, label: "Connecting to GitHub & validating permissions" },
    { number: 2, label: "Fetching repository metadata & default branch" },
    { number: 3, label: "Analyzing package dependencies & manifest" },
    { number: 4, label: "Detecting framework, version & router architecture" },
    { number: 5, label: "Inspecting project directory tree & config files" },
    { number: 6, label: "Checking SEO configurations & source tags" },
    { number: 7, label: "Saving analysis results to database" },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* ─── 1. REAL-TIME ANALYSIS SCANNER (When isAnalyzing is true) ─── */}
      {isAnalyzing && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-[#121216] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 animate-pulse" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="animate-spin text-rose-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Inspecting Repository Architecture
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Step {currentStep || 1} of 7
            </span>
          </div>

          <div className="space-y-2.5">
            {analysisSteps.map((step) => {
              const isCompleted = (currentStep || 1) > step.number;
              const isCurrent = (currentStep || 1) === step.number;

              return (
                <div
                  key={step.number}
                  className={`flex items-center gap-3 text-xs font-mono transition-all duration-200 ${
                    isCompleted
                      ? "text-emerald-400"
                      : isCurrent
                      ? "text-white font-semibold"
                      : "text-neutral-500 opacity-60"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[11px]">
                    {isCompleted ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 2. SECTION A: REPOSITORY OVERVIEW ────────────────────────── */}
      <div className="p-6 rounded-2xl border border-[#22222A] bg-[#121216] space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {repo.fullName || repo.name || "Repository"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1.5">
                <GitBranch size={12} className="text-neutral-400" />
                {repo.defaultBranch || "main"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {framework.name || "Detecting..."}
              </span>
            </div>

            <p className="text-sm text-neutral-400 max-w-2xl">
              {repo.description || "No repository description provided on GitHub."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onReanalyze}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-neutral-700"
            >
              <RefreshCw size={13} className={isAnalyzing ? "animate-spin text-rose-400" : ""} />
              <span>{isAnalyzing ? "Analyzing..." : "Re-inspect"}</span>
            </button>

            {repo.htmlUrl && (
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors inline-flex items-center gap-1.5 border border-neutral-800"
              >
                <span>GitHub</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-800/80">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <Star size={14} className="text-amber-400" />
            <span>{repo.stars ?? 0} stars</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <GitFork size={14} className="text-neutral-400" />
            <span>{repo.forks ?? 0} forks</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <FileCode size={14} className="text-sky-400" />
            <span>{repo.language || "TypeScript"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <span>Analyzed: {lastAnalyzed}</span>
          </div>
        </div>
      </div>

      {/* ─── 3. SECTION B: FRAMEWORK & ROUTER DETECTION ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Framework & Version */}
        <div className="p-5 rounded-xl border border-[#22222A] bg-[#121216] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-neutral-400">Framework</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {framework.confidence || "high"} confidence
            </span>
          </div>
          <p className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>{framework.name || "Unknown"}</span>
            {framework.version && (
              <span className="text-xs font-mono text-neutral-400 font-normal">
                v{framework.version}
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500 font-mono">
            React: {framework.reactVersion ? `v${framework.reactVersion}` : "N/A"}
          </p>
        </div>

        {/* Router Architecture */}
        <div className="p-5 rounded-xl border border-[#22222A] bg-[#121216] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-neutral-400">Router</span>
            <Layers size={14} className="text-rose-400" />
          </div>
          <p className="text-lg font-bold text-white tracking-tight capitalize">
            {router.type ? router.type.replace(/-/g, " ") : "Unknown"}
          </p>
          <p className="text-xs text-neutral-500 truncate" title={router.details}>
            {router.details || "No router convention detected"}
          </p>
        </div>

        {/* Package Manager & Tooling */}
        <div className="p-5 rounded-xl border border-[#22222A] bg-[#121216] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-neutral-400">Tooling</span>
            <span className="text-xs font-mono text-neutral-400 uppercase font-semibold">
              {framework.packageManager || "npm"}
            </span>
          </div>
          <p className="text-lg font-bold text-white tracking-tight">
            {framework.language || "TypeScript"}
          </p>
          <p className="text-xs text-neutral-500 font-mono">
            {framework.isMonorepo ? "Monorepo detected" : "Standard repository"}
          </p>
        </div>

        {/* Deployment Platform */}
        <div className="p-5 rounded-xl border border-[#22222A] bg-[#121216] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-neutral-400">Deployment</span>
            <Server size={14} className="text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white tracking-tight truncate">
            {deployment.platform || "Unconfigured"}
          </p>
          <p className="text-xs text-neutral-500 truncate" title={deployment.details}>
            {deployment.configFile ? `Config: ${deployment.configFile}` : deployment.liveDeploymentVerified ? "Live verified" : "No config file"}
          </p>
        </div>
      </div>

      {/* ─── 4. SECTION C & D: PROJECT STRUCTURE & SEO CONFIGURATION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Collapsible Project Tree (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Project Structure
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {structure.totalFilesCount || 0} files total
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[#22222A] bg-[#121216] max-h-[500px] overflow-y-auto no-scrollbar space-y-1">
            {structure.visualTree && structure.visualTree.children?.length > 0 ? (
              <TreeNode node={structure.visualTree} depth={0} />
            ) : (
              <div className="p-6 text-center text-xs text-neutral-500 font-mono">
                No visual directory tree available.
              </div>
            )}
          </div>

          {/* Important Config Files Summary */}
          {structure.importantFiles && structure.importantFiles.length > 0 && (
            <div className="p-4 rounded-xl border border-neutral-800/80 bg-[#121216]/60 space-y-2">
              <span className="text-xs uppercase font-mono font-bold text-neutral-400">
                Key Config Files ({structure.importantFiles.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {structure.importantFiles.map((file, idx) => (
                  <span
                    key={`${file.path}-${idx}`}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700"
                  >
                    {file.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: SEO Configuration Status Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileSearch size={16} className="text-rose-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                SEO Configuration Inspection
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "all" ? "bg-neutral-800 text-white font-semibold" : "text-neutral-400 hover:text-white"
                }`}
              >
                All ({seoItems.length})
              </button>
              <button
                onClick={() => setActiveTab("present")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "present" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-neutral-400 hover:text-emerald-400"
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setActiveTab("partial")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "partial" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-neutral-400 hover:text-amber-400"
                }`}
              >
                Partial ({partialCount})
              </button>
              <button
                onClick={() => setActiveTab("missing")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "missing" ? "bg-rose-500/20 text-rose-300 font-semibold" : "text-neutral-400 hover:text-rose-400"
                }`}
              >
                Missing ({missingCount})
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredSeoItems.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.key}
                  className="p-4 rounded-xl border border-[#22222A] bg-[#121216] hover:border-neutral-700 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <IconComp size={15} className="text-neutral-400 shrink-0" />
                      <span className="text-sm font-semibold text-white tracking-tight">
                        {item.label}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {item.details || "No details available."}
                    </p>

                    {item.sources && item.sources.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono text-neutral-500">Sources:</span>
                        {item.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700 truncate max-w-[200px]"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <SeoStatusBadge status={item.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 5. SECTION F: PRIMARY ACTION (START SEO AUDIT) ──────────── */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-gradient-to-r from-[#121216] via-[#16161D] to-[#121216] flex items-center justify-between flex-wrap gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Repository analysis completed.
            </h3>
          </div>
          <p className="text-xs text-neutral-400 max-w-xl">
            MetaMend has mapped your framework ({framework.name || "App"}), routing convention, and SEO configurations. Proceed to run a full audit against Google search standards.
          </p>
        </div>

        <button
          onClick={onStartAudit}
          className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-white hover:bg-neutral-200 transition-all active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <span>Start SEO Audit</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
