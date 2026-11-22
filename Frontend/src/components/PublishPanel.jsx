/**
 * PublishPanel Modal Component (Feature 5)
 * Bundles approved SEO fixes into a single commit and opens a GitHub Pull Request
 * or executes a guarded direct commit to the default branch.
 */

import React, { useState, useMemo } from "react";
import {
  GitPullRequest,
  GitCommit,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileCode2,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

export default function PublishPanel({
  isOpen,
  onClose,
  fixes = [],
  repoFullName = "",
  defaultBranch = "main",
  token,
  onPublishSuccess,
  onNavigateToAudit,
}) {
  const [mode, setMode] = useState("pr"); // 'pr' | 'direct'
  const [prTitle, setPrTitle] = useState("");
  const [updateExistingPr, setUpdateExistingPr] = useState(false);
  const [allowPlaceholders, setAllowPlaceholders] = useState(false);

  // Direct mode guard states
  const [showAdvancedDirect, setShowAdvancedDirect] = useState(false);
  const [confirmRepoInput, setConfirmRepoInput] = useState("");
  const [confirmDirectChecked, setConfirmDirectChecked] = useState(false);

  // Execution states
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState("");
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [copiedRevert, setCopiedRevert] = useState(false);

  // Extract repo short name from full name
  const repoName = useMemo(() => {
    return repoFullName.includes("/") ? repoFullName.split("/")[1] : repoFullName;
  }, [repoFullName]);

  // Approved fixes that will be published
  const approvedFixes = useMemo(() => {
    return fixes.filter((f) => f.status === "approved");
  }, [fixes]);

  // Non-approved fixes that will be skipped
  const skippedFixes = useMemo(() => {
    return fixes.filter((f) => f.status !== "approved");
  }, [fixes]);

  // Unresolved placeholders check
  const hasPlaceholders = useMemo(() => {
    return approvedFixes.some((f) => /\[TODO:[^\]]+\]|TODO:/i.test(f.patch?.proposedContent || ""));
  }, [approvedFixes]);

  if (!isOpen) return null;

  // Direct commit validation
  const isDirectAuthorized =
    confirmDirectChecked && confirmRepoInput.trim().toLowerCase() === repoName.toLowerCase();

  const canPublish =
    approvedFixes.length > 0 &&
    !isPublishing &&
    (!hasPlaceholders || allowPlaceholders) &&
    (mode === "pr" || (mode === "direct" && isDirectAuthorized));

  const handlePublish = async () => {
    if (!canPublish || !token) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    setPublishStep("Validating code syntax and security rules...");

    try {
      setTimeout(() => setPublishStep("Checking remote branch drift on GitHub..."), 600);
      setTimeout(() => setPublishStep("Building Git blobs and batched tree..."), 1200);
      setTimeout(() => setPublishStep(mode === "pr" ? "Creating branch and opening Pull Request..." : "Writing commit to default branch..."), 1800);

      const endpoint = `/api/repos/${encodeURIComponent(repoFullName)}/fixes/publish`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo: repoFullName,
          fixIds: approvedFixes.map((f) => f._id),
          mode,
          prTitle: prTitle.trim() || undefined,
          updateExistingPr,
          allowPlaceholders,
          confirmDirect: mode === "direct",
          confirmRepoName: mode === "direct" ? confirmRepoInput.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.code === "EXISTING_PR_OPEN") {
        setPublishError({
          title: "Existing Pull Request Open",
          message: data.message,
          existingPr: data.existingPr,
          is409: true,
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to publish fixes to GitHub.");
      }

      setPublishResult(data);
      if (onPublishSuccess) {
        onPublishSuccess(data);
      }
    } catch (err) {
      console.error("Publish error:", err);
      setPublishError({
        title: "Publish Failed",
        message: err.message,
      });
    } finally {
      setIsPublishing(false);
      setPublishStep("");
    }
  };

  const copyRevertCommand = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedRevert(true);
    setTimeout(() => setCopiedRevert(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[#22222A] bg-[#121216] shadow-2xl flex flex-col overflow-hidden">
        {/* ─── MODAL HEADER ─── */}
        <div className="p-6 border-b border-[#22222A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Publish SEO Fixes
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Feature 5
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Bundle {approvedFixes.length} approved fix(es) into a single commit for{" "}
                <code className="text-neutral-200 font-mono">{repoFullName}</code>
              </p>
            </div>
          </div>

          {!isPublishing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ─── MODAL BODY ─── */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS SCREEN */}
          {publishResult && (
            <div className="space-y-5 py-4">
              <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {publishResult.mode === "pr" ? "Pull Request Created Successfully!" : "Direct Commit Pushed!"}
                </h3>
                <p className="text-xs text-neutral-300 max-w-md mx-auto">
                  {publishResult.mode === "pr"
                    ? `Branch ${publishResult.branch} was created with ${publishResult.publishedCount} file patch(es) in 1 commit.`
                    : `Direct commit successfully applied to branch ${publishResult.branch}.`}
                </p>

                {publishResult.prUrl && (
                  <div className="pt-2">
                    <a
                      href={publishResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all shadow-lg cursor-pointer"
                    >
                      <span>View Pull Request #{publishResult.prNumber} on GitHub</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Direct mode revert hint */}
              {publishResult.revertHint && (
                <div className="p-4 rounded-xl border border-[#22222A] bg-[#18181D] space-y-2">
                  <div className="text-[11px] font-mono uppercase text-neutral-400 flex items-center justify-between">
                    <span>Revert Command Hint</span>
                    <button
                      onClick={() => copyRevertCommand(publishResult.revertHint)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px]"
                    >
                      {copiedRevert ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRevert ? "Copied" : "Copy command"}</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono p-2.5 rounded-lg bg-black/50 text-neutral-200 overflow-x-auto">
                    {publishResult.revertHint}
                  </pre>
                </div>
              )}

              {/* Next Steps CTA */}
              <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216] flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">Verify Your Improved SEO Score</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Merge the pull request and re-run your MetaMend SEO Audit to confirm the fixes.
                  </p>
                </div>
                {onNavigateToAudit && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToAudit();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shrink-0"
                  >
                    <span>Go to SEO Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE FORM VIEW */}
          {!publishResult && (
            <>
              {/* Error banner */}
              {publishError && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{publishError.title}</span>
                  </div>
                  <p className="text-xs text-neutral-300">{publishError.message}</p>

                  {publishError.is409 && publishError.existingPr && (
                    <div className="pt-2 flex items-center gap-3">
                      <a
                        href={publishError.existingPr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open PR #{publishError.existingPr.number}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => {
                          setUpdateExistingPr(true);
                          setPublishError(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-black font-semibold text-xs cursor-pointer"
                      >
                        Update This Existing PR
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Files to commit list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-white">Files to Commit ({approvedFixes.length})</span>
                  <span>Target: {defaultBranch}</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-[#22222A] bg-[#18181D]">
                  {approvedFixes.map((fix) => {
                    const isCreate = fix.operation === "create" || fix.patch?.action === "create";
                    return (
                      <div
                        key={fix._id}
                        className="p-2 rounded-lg bg-[#121216] border border-[#22222A] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="font-mono text-neutral-200 truncate">{fix.patch?.filePath}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-medium ${isCreate
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                        >
                          {isCreate ? "CREATE" : "MODIFY"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {skippedFixes.length > 0 && (
                  <p className="text-[11px] text-neutral-500">
                    ℹ️ {skippedFixes.length} fix(es) in pending, rejected, or manual status will not be included.
                  </p>
                )}
              </div>

              {/* Placeholder warning */}
              {hasPlaceholders && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Unresolved TODO Placeholders</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    One or more approved fixes contain placeholder tags (e.g. <code>[TODO: ...]</code>). By default,
                    MetaMend blocks publishing placeholder text to prevent shipping unfinished copy.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-xs text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPlaceholders}
                      onChange={(e) => setAllowPlaceholders(e.target.checked)}
                      className="rounded border-[#2E2E38] text-amber-500 focus:ring-amber-500"
                    />
                    <span>Allow publishing with TODO placeholders anyway</span>
                  </label>
                </div>
              )}

              {/* PR Title input */}
              {mode === "pr" && (
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 block mb-1.5">
                    Pull Request Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`SEO: fix ${approvedFixes.length} issues with MetaMend`}
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Advanced: Direct Commit Collapsible */}
              <div className="pt-2 border-t border-[#22222A]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDirect(!showAdvancedDirect)}
                  className="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Advanced: Direct commit to {defaultBranch} (No PR)</span>
                  </span>
                  {showAdvancedDirect ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedDirect && (
                  <div className="mt-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                    <p className="text-xs text-rose-300 leading-relaxed">
                      ⚠️ <strong>Warning:</strong> Direct mode commits directly to your production default branch{" "}
                      <code>{defaultBranch}</code> without review. Only authorized if branch protection allows it.
                    </p>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                        Type <code className="text-white font-bold">{repoName}</code> to confirm:
                      </label>
                      <input
                        type="text"
                        placeholder={repoName}
                        value={confirmRepoInput}
                        onChange={(e) => setConfirmRepoInput(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-[#18181D] border border-rose-500/30 text-white focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmDirectChecked}
                        onChange={(e) => {
                          setConfirmDirectChecked(e.target.checked);
                          if (e.target.checked) setMode("direct");
                          else setMode("pr");
                        }}
                        className="rounded border-rose-500 text-rose-500 focus:ring-rose-500"
                      />
                      <span>I understand the risks of committing directly to {defaultBranch}.</span>
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── MODAL FOOTER ─── */}
        <div className="p-4 border-t border-[#22222A] bg-[#101014] flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
          >
            {publishResult ? "Close" : "Cancel"}
          </button>

          {!publishResult && (
            <div className="flex items-center gap-3">
              {isPublishing ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{publishStep || "Publishing..."}</span>
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${mode === "direct"
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-black"
                    }`}
                >
                  {mode === "direct" ? <GitCommit className="w-4 h-4" /> : <GitPullRequest className="w-4 h-4" />}
                  <span>
                    {mode === "direct"
                      ? `Commit Directly to ${defaultBranch}`
                      : `Create Pull Request (${approvedFixes.length} Files)`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
