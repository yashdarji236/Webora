/**
 * PreviewPublishModal Component
 * Allows developers to review deterministic code diffs and send a Pull Request
 * directly to the main repository for edited preview metadata (Title, Favicon, Description, etc.).
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  X,
  FileCode2,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Globe,
  Tag,
  AlignLeft,
} from "lucide-react";

export default function PreviewPublishModal({
  isOpen,
  onClose,
  repoFullName = "",
  defaultBranch = "main",
  token,
  originalMetadata = {},
  proposedMetadata = {},
  onPublishSuccess,
}) {
  const [prTitle, setPrTitle] = useState("SEO: Update page title, favicon and meta descriptions");
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [diffError, setDiffError] = useState(null);

  // Publishing states
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState("");
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState(null);

  // Calculate changed fields summary
  const changesSummary = useMemo(() => {
    const list = [];
    if ((proposedMetadata.title || "") !== (originalMetadata.title || "")) {
      list.push({
        field: "Page Title",
        icon: Tag,
        from: originalMetadata.title || "[Empty]",
        to: proposedMetadata.title || "[Empty]",
      });
    }
    if ((proposedMetadata.description || "") !== (originalMetadata.description || "")) {
      list.push({
        field: "Meta Description",
        icon: AlignLeft,
        from: originalMetadata.description || "[Empty]",
        to: proposedMetadata.description || "[Empty]",
      });
    }
    if ((proposedMetadata.favicon || "") !== (originalMetadata.favicon || "")) {
      list.push({
        field: "Favicon",
        icon: Globe,
        from: originalMetadata.favicon || "[Empty]",
        to: proposedMetadata.favicon || "[Empty]",
      });
    }
    if ((proposedMetadata.canonical || "") !== (originalMetadata.canonical || "")) {
      list.push({
        field: "Canonical URL",
        icon: Globe,
        from: originalMetadata.canonical || "[Empty]",
        to: proposedMetadata.canonical || "[Empty]",
      });
    }
    if ((proposedMetadata.openGraph?.image || "") !== (originalMetadata.openGraph?.image || "")) {
      list.push({
        field: "OG Image",
        icon: Sparkles,
        from: originalMetadata.openGraph?.image || "[Empty]",
        to: proposedMetadata.openGraph?.image || "[Empty]",
      });
    }
    return list;
  }, [originalMetadata, proposedMetadata]);

  // Fetch diff when modal opens
  useEffect(() => {
    if (!isOpen || !token || !repoFullName) return;

    let ignore = false;
    async function fetchDiff() {
      setIsLoadingDiff(true);
      setDiffError(null);
      setPublishResult(null);
      setPublishError(null);

      try {
        const res = await fetch(`/api/repos/${encodeURIComponent(repoFullName)}/fixes/preview-diff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            repo: repoFullName,
            branch: defaultBranch,
            metadata: proposedMetadata,
          }),
        });

        const data = await res.json();
        if (!ignore) {
          if (res.ok && data.success && data.data) {
            setDiffData(data.data);
          } else {
            setDiffError(data.message || "Failed to generate preview diff.");
          }
          setIsLoadingDiff(false);
        }
      } catch (err) {
        if (!ignore) {
          setDiffError(err.message || "Network error fetching diff.");
          setIsLoadingDiff(false);
        }
      }
    }

    fetchDiff();
    return () => {
      ignore = true;
    };
  }, [isOpen, repoFullName, defaultBranch, token, proposedMetadata]);

  if (!isOpen) return null;

  const handleSendPullRequest = async () => {
    if (!token || !repoFullName || isPublishing) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    setPublishStep("Validating framework AST and syntax rules...");

    try {
      setTimeout(() => setPublishStep("Fetching remote file & preparing Git tree..."), 600);
      setTimeout(() => setPublishStep("Creating branch & committing code changes..."), 1200);
      setTimeout(() => setPublishStep("Opening Pull Request against main branch..."), 1800);

      const res = await fetch(`/api/repos/${encodeURIComponent(repoFullName)}/fixes/preview-publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo: repoFullName,
          branch: defaultBranch,
          metadata: proposedMetadata,
          targetFile: diffData?.targetFile,
          filePath: diffData?.targetFile,
          prTitle: prTitle.trim() || "SEO: Update page title, favicon and meta descriptions",
          mode: "pr",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPublishResult(data);
        if (typeof onPublishSuccess === "function") {
          onPublishSuccess(data);
        }
      } else {
        setPublishError(data.message || "Failed to create Pull Request.");
      }
    } catch (err) {
      setPublishError(err.message || "Network error submitting Pull Request.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#2A2A38] bg-[#121217] shadow-2xl text-left overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#22222D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <GitPullRequest size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Send Pull Request to GitHub
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                {repoFullName} · Target branch: <span className="text-neutral-200">{defaultBranch}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success Screen */}
          {publishResult ? (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-white">
                  Pull Request Created Successfully!
                </h3>
                <p className="text-xs text-neutral-400">
                  Your metadata changes (Title, Favicon, Description) have been committed and opened as a PR on GitHub.
                </p>
              </div>

              {publishResult.prUrl && (
                <div className="p-4 rounded-xl bg-[#0B0B0E] border border-neutral-800 text-left space-y-2 max-w-lg mx-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Pull Request</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      #{publishResult.prNumber || "1"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Branch</span>
                    <span className="text-neutral-300 font-mono">{publishResult.branch}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                {publishResult.prUrl && (
                  <a
                    href={publishResult.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black inline-flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <span>View Pull Request on GitHub</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary of Modified Fields */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400">
                  Modified Metadata Fields ({changesSummary.length})
                </h3>
                <div className="space-y-2">
                  {changesSummary.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#0B0B0E] border border-[#22222D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 text-neutral-300 font-medium">
                          <Icon size={14} className="text-purple-400 shrink-0" />
                          <span>{item.field}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0 font-mono text-[11px]">
                          <span className="text-neutral-500 truncate max-w-[140px] sm:max-w-[180px]">
                            {item.from}
                          </span>
                          <ArrowRight size={12} className="text-neutral-600 shrink-0" />
                          <span className="text-emerald-400 font-semibold truncate max-w-[160px] sm:max-w-[220px]">
                            {item.to}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target File & Code Diff */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400">
                    Source Code Patch Preview
                  </h3>
                  {diffData?.targetFile && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 inline-flex items-center gap-1.5">
                      <FileCode2 size={12} className="text-purple-400" />
                      {diffData.targetFile}
                    </span>
                  )}
                </div>

                {isLoadingDiff ? (
                  <div className="p-8 rounded-xl bg-[#0B0B0E] border border-[#22222D] flex items-center justify-center gap-2 text-xs text-neutral-400">
                    <Loader2 size={16} className="animate-spin text-purple-400" />
                    <span>Analyzing repository structure & generating AST diff...</span>
                  </div>
                ) : diffError ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                    <span>{diffError}</span>
                  </div>
                ) : diffData?.diff ? (
                  <div className="rounded-xl bg-[#08080A] border border-[#22222D] overflow-hidden">
                    <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-neutral-300 max-h-56">
                      {diffData.diff.split("\n").map((line, idx) => {
                        let lineStyle = "text-neutral-400";
                        if (line.startsWith("+") && !line.startsWith("+++")) {
                          lineStyle = "text-emerald-400 bg-emerald-500/10 px-1 rounded block";
                        } else if (line.startsWith("-") && !line.startsWith("---")) {
                          lineStyle = "text-rose-400 bg-rose-500/10 px-1 rounded block";
                        } else if (line.startsWith("@")) {
                          lineStyle = "text-purple-400/80 font-bold block";
                        }
                        return (
                          <div key={idx} className={lineStyle}>
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#22222D] text-xs text-neutral-400 text-center">
                    No source code changes detected.
                  </div>
                )}
              </div>

              {/* PR Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400 block">
                  Pull Request Title
                </label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  disabled={isPublishing}
                  placeholder="SEO: Update page title, favicon and meta descriptions"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#22222D] text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 disabled:opacity-60 font-medium"
                />
              </div>

              {/* Error Message */}
              {publishError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Progress Indicator */}
              {isPublishing && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs flex items-center gap-2.5 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-purple-400 shrink-0" />
                  <span>{publishStep || "Submitting to GitHub..."}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!publishResult && (
          <div className="flex items-center justify-between p-5 border-t border-[#22222D] bg-[#0E0E12]">
            <span className="text-[11px] text-neutral-500">
              Creates 1 commit on dedicated branch & opens 1 PR against {defaultBranch}.
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPullRequest}
                disabled={isPublishing || isLoadingDiff || Boolean(diffError)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-black inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    <span>Opening PR...</span>
                  </>
                ) : (
                  <>
                    <GitPullRequest size={14} />
                    <span>Create Pull Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
