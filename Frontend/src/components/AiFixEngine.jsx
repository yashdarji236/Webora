import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileCode,
  AlertTriangle,
  ShieldAlert,
  Info,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Columns,
  List,
  Search,
  ArrowRight,
  RefreshCw,
  Code2,
  Terminal,
  Lock,
  Wand2,
  Edit3,
  GitPullRequest,
} from "lucide-react";
import PublishPanel from "./PublishPanel";

export default function AiFixEngine({
  projectId,
  repoDetails,
  analysisData,
  auditData,
  isLoadingAudit = false,
  token,
  onNavigateToAudit,
  onStartAudit,
}) {
  const [fixes, setFixes] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    proposed: 0,
    approved: 0,
    rejected: 0,
    manual: 0,
    stale: 0,
    published: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [aiKeyMissing, setAiKeyMissing] = useState(false);
  const [auditRequired, setAuditRequired] = useState(false);
  const [fetchedAudit, setFetchedAudit] = useState(null);

  // Feature 5 states
  const [seoState, setSeoState] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Engine Mode: 'rules' (default) | 'rules+ai-copy' | 'ai'
  const [engineMode, setEngineMode] = useState("rules");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'proposed' | 'approved' | 'rejected' | 'manual'
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Card view preferences
  const [expandedCards, setExpandedCards] = useState({});
  const [diffViewMode, setDiffViewMode] = useState({}); // fixId -> 'split' | 'unified'
  const [copiedId, setCopiedId] = useState(null);

  // Rejection & Regeneration modals / states
  const [rejectingFixId, setRejectingFixId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [regeneratingFixId, setRegeneratingFixId] = useState(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [placeholderOverrides, setPlaceholderOverrides] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const repoSlug = repoDetails?.repo?.name || projectId;
  const repoOwner = repoDetails?.owner?.login || repoDetails?.repo?.owner?.login || "";
  const repoFullName = repoDetails?.repo?.fullName || (repoOwner && repoSlug ? `${repoOwner}/${repoSlug}` : projectId);

  // Fetch fixes from Backend
  const loadFixes = useCallback(async () => {
    if (!repoSlug || !token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const query = new URLSearchParams({
        projectId: repoSlug,
        repo: repoFullName,
        owner: repoOwner,
      });

      const res = await fetch(`/api/fixes?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFixes(data.data || []);
          if (data.stats) setStats(data.stats);

          // Auto-expand first 2 cards
          const initialExpanded = {};
          (data.data || []).slice(0, 2).forEach((f) => {
            initialExpanded[f._id] = true;
          });
          setExpandedCards(initialExpanded);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || "Failed to load fixes.");
      }
    } catch (err) {
      console.error("Error loading fixes:", err);
      setErrorMessage("Network error while loading fixes.");
    } finally {
      setIsLoading(false);
    }
  }, [repoSlug, repoFullName, repoOwner, token]);

  useEffect(() => {
    let ignore = false;

    async function fetchInitialFixes() {
      if (!repoSlug || !token) return;
      try {
        const query = new URLSearchParams({
          projectId: repoSlug,
          repo: repoFullName,
          owner: repoOwner,
        });

        const res = await fetch(`/api/fixes?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && !ignore) {
            setFixes(data.data || []);
            if (data.stats) setStats(data.stats);

            const initialExpanded = {};
            (data.data || []).slice(0, 2).forEach((f) => {
              initialExpanded[f._id] = true;
            });
            setExpandedCards(initialExpanded);
          }
        }
      } catch (err) {
        console.warn("Initial fixes load:", err);
      }
    }

    fetchInitialFixes();
    return () => {
      ignore = true;
    };
  }, [repoSlug, repoFullName, repoOwner, token]);

  // Detect SEO maturity level
  const checkSeoState = useCallback(async () => {
    if (!token || !repoFullName) return;
    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(repoFullName)}/fixes/detect-seo-state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setSeoState(data.data);
        }
      }
    } catch (err) {
      console.warn("Could not detect SEO state:", err);
    }
  }, [repoFullName, token]);

  useEffect(() => {
    let ignore = false;
    async function fetchInitialSeoState() {
      if (!token || !repoFullName) return;
      try {
        const res = await fetch(`/api/repos/${encodeURIComponent(repoFullName)}/fixes/detect-seo-state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && !ignore) {
            setSeoState(data.data);
          }
        }
      } catch (err) {
        console.warn("Could not detect SEO state:", err);
      }
    }
    fetchInitialSeoState();
    return () => {
      ignore = true;
    };
  }, [repoFullName, token]);

  // Generate full SEO baseline (Feature 5 Bootstrap)
  const handleRunBootstrap = async () => {
    if (!token || !repoFullName) return;
    setIsBootstrapping(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(repoFullName)}/fixes/bootstrap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo: repoFullName,
          branch: repoDetails?.repo?.defaultBranch || "main",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await loadFixes();
        checkSeoState();
      } else {
        setErrorMessage(data.message || "Failed to generate SEO baseline fixes.");
      }
    } catch (err) {
      console.error("Bootstrap error:", err);
      setErrorMessage("Network error during SEO baseline generation.");
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Generate fixes
  const handleGenerateFixes = async (targetIssueIds = null) => {
    if (!token || !repoSlug) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setAiKeyMissing(false);

    if (engineMode === "rules") {
      setGenerationStep("Resolving AST and executing deterministic SEO rules...");
    } else if (engineMode === "rules+ai-copy") {
      setGenerationStep("Running AST rules and generating AI text for placeholders...");
    } else {
      setGenerationStep("Analyzing detected audit issues with LLM...");
    }

    try {
      setTimeout(() => setGenerationStep("Validating syntax, AST delimiters, and framework rules..."), 1200);

      const res = await fetch(`/api/fixes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: repoSlug,
          repo: repoFullName,
          owner: repoOwner,
          branch: repoDetails?.repo?.defaultBranch || "main",
          issueIds: targetIssueIds,
          mode: engineMode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        await loadFixes();
      } else {
        if (data.code === "AI_KEY_MISSING") {
          setAiKeyMissing(true);
        } else if (data.code === "AUDIT_REQUIRED" || data.hasAudit === false) {
          setAuditRequired(true);
        } else {
          setErrorMessage(data.message || "Failed to generate fixes.");
        }
      }
    } catch (err) {
      console.error("Error generating fixes:", err);
      setErrorMessage("Network error during fix generation.");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // Approve a fix
  const handleApprove = async (fixId) => {
    if (!token) return;
    setActionLoadingId(fixId);
    try {
      const res = await fetch(`/api/fixes/${fixId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setFixes((prev) => prev.map((f) => (f._id === fixId ? data.data : f)));
          setStats((prev) => ({
            ...prev,
            proposed: Math.max(0, prev.proposed - 1),
            approved: prev.approved + 1,
          }));
        }
      }
    } catch (err) {
      console.error("Error approving fix:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject a fix
  const handleRejectSubmit = async () => {
    if (!token || !rejectingFixId || !rejectionReason.trim()) return;
    setActionLoadingId(rejectingFixId);

    try {
      const res = await fetch(`/api/fixes/${rejectingFixId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setFixes((prev) => prev.map((f) => (f._id === rejectingFixId ? data.data : f)));
          setStats((prev) => ({
            ...prev,
            proposed: Math.max(0, prev.proposed - 1),
            rejected: prev.rejected + 1,
          }));
          setRejectingFixId(null);
          setRejectionReason("");
        }
      }
    } catch (err) {
      console.error("Error rejecting fix:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Regenerate a fix (with instructions or overrides)
  const handleRegenerateSubmit = async (fixId = null, customOverrides = null) => {
    const targetId = fixId || regeneratingFixId;
    if (!token || !targetId) return;
    setActionLoadingId(targetId);

    const overrides = customOverrides || placeholderOverrides[targetId] || {};

    try {
      const res = await fetch(`/api/fixes/${targetId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instructions: regeneratePrompt.trim(),
          mode: engineMode,
          overrides,
          projectId: repoSlug,
          repo: repoFullName,
          owner: repoOwner,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data) {
        setFixes((prev) => prev.map((f) => (f._id === targetId ? data.data : f)));
        setRegeneratingFixId(null);
        setRegeneratePrompt("");
      } else {
        if (data.code === "AI_KEY_MISSING") {
          setAiKeyMissing(true);
        }
        setErrorMessage(data.message || "Failed to regenerate fix.");
      }
    } catch (err) {
      console.error("Error regenerating fix:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy code handler
  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDiffMode = (id) => {
    setDiffViewMode((prev) => ({
      ...prev,
      [id]: prev[id] === "unified" ? "split" : "unified",
    }));
  };

  // Filtered fixes list
  const filteredFixes = useMemo(() => {
    return fixes.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && f.issueCategory !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = f.issueTitle?.toLowerCase().includes(query);
        const matchesFile = f.patch?.filePath?.toLowerCase().includes(query);
        const matchesCategory = f.issueCategory?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesFile && !matchesCategory) return false;
      }
      return true;
    });
  }, [fixes, statusFilter, severityFilter, categoryFilter, searchQuery]);

  // Categories list for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set(fixes.map((f) => f.issueCategory).filter(Boolean));
    return Array.from(cats);
  }, [fixes]);

  // Secondary fetch if auditData prop was not passed
  useEffect(() => {
    let ignore = false;
    async function checkAudit() {
      if (auditData || !repoSlug || !token) return;
      try {
        const query = new URLSearchParams({
          projectId: repoSlug,
          repo: repoFullName,
          owner: repoOwner,
        });
        const res = await fetch(`/api/audit/latest?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success && data.audit) {
            setFetchedAudit(data.audit);
            setAuditRequired(false);
          }
        }
      } catch (err) {
        console.warn("Could not check latest audit in fix engine:", err);
      }
    }
    checkAudit();
    return () => {
      ignore = true;
    };
  }, [auditData, repoSlug, repoFullName, repoOwner, token]);

  const currentAudit = auditData || fetchedAudit;
  const hasAudit = !auditRequired && Boolean(
    (currentAudit && (
      (Array.isArray(currentAudit.issues) && currentAudit.issues.length > 0) ||
      currentAudit.audit?.status === "completed" ||
      currentAudit.status === "completed"
    )) || (fixes && fixes.length > 0)
  );

  const auditPendingIssuesCount = (currentAudit?.issues || []).filter(
    (i) => i.status !== "passed" && i.status !== "resolved"
  ).length;

  if (isLoadingAudit) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4 select-none">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-neutral-400 font-medium">Checking SEO audit status for {repoFullName}...</p>
      </div>
    );
  }

  // Centered empty state when no audit has been run for this repository
  if (!hasAudit && fixes.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-lg p-8 rounded-2xl border border-[#22222A] bg-[#121216] text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles size={28} strokeWidth={1.7} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              {repoFullName || "SEO Code Fix Engine"}
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              SEO Audit Required First
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
              No SEO audit found for this project. Please run an SEO audit on your deployed site for{" "}
              <code className="text-neutral-200 font-mono">{repoSlug || "this repository"}</code>{" "}
              before generating fixes so MetaMend can analyze real issues and generate framework-specific code patches.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={() => {
                if (onStartAudit) {
                  onStartAudit();
                } else if (onNavigateToAudit) {
                  onNavigateToAudit();
                }
              }}
              className="px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-white hover:bg-neutral-200 transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Start SEO Audit</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─── 1. HEADER & CONTROLS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Automated SEO Code Fix Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Feature 4
                </span>
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Deterministic, AST-verified source code patches for {repoFullName}. Review, diff, and approve fixes.
              </p>
            </div>
          </div>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFixes()}
            disabled={isLoading || isGenerating}
            className="p-2.5 rounded-lg border border-[#22222A] bg-[#121216] hover:bg-[#18181D] text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Fixes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          <button
            onClick={() => handleGenerateFixes()}
            disabled={isGenerating || !hasAudit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#18181D] border border-[#2E2E38] hover:bg-[#22222A] text-neutral-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Generating Fixes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Generate Fixes</span>
              </>
            )}
          </button>

          {stats.approved > 0 && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Publish PR ({stats.approved})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── FEATURE 5: BOOTSTRAP FULL SEO BASELINE BANNER ─── */}
      {seoState?.level === "none" && (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                No Baseline SEO Detected
              </span>
              <span className="text-[10px] text-neutral-400">
                Missing {seoState.missing?.slice(0, 3).join(", ")}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Create Full SEO Baseline</h3>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
              This repository lacks fundamental SEO metadata, robots directives, and a sitemap. MetaMend can generate a
              complete framework-idiomatic baseline setup (including new files) in one click.
            </p>
          </div>
          <button
            onClick={handleRunBootstrap}
            disabled={isBootstrapping}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isBootstrapping ? "animate-spin" : ""}`} />
            <span>{isBootstrapping ? "Generating Baseline..." : "Create Full SEO Baseline"}</span>
          </button>
        </div>
      )}

      {/* ─── 2. ENGINE MODE SELECTOR ─── */}
      <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Generation Engine & Privacy Mode
          </div>
          <span className="text-[11px] font-mono text-neutral-400">Default: Rule-based (No external API)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode 1: Rule-based */}
          <div
            onClick={() => setEngineMode("rules")}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${engineMode === "rules"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-[#22222A] bg-[#18181D] hover:border-[#2E2E38]"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Rule-based (Private)
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                DEFAULT
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Deterministic AST & template engine. Customer code never leaves server. Zero external API calls.
            </p>
          </div>

          {/* Mode 2: Rules + AI copywriting */}
          <div
            onClick={() => setEngineMode("rules+ai-copy")}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${engineMode === "rules+ai-copy"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-[#22222A] bg-[#18181D] hover:border-[#2E2E38]"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                Rules + AI Copy
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                HYBRID
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Deterministic AST fixes. AI writes copy only for missing titles/descriptions. Never sends source code.
            </p>
          </div>

          {/* Mode 3: Full AI */}
          <div
            onClick={() => setEngineMode("ai")}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${engineMode === "ai"
              ? "border-purple-500 bg-purple-500/10"
              : "border-[#22222A] bg-[#18181D] hover:border-[#2E2E38]"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Full AI (Advanced)
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                LLM
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Direct generation via Gemini or OpenAI. Requires configured API key in Backend/.env.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. AI KEY MISSING BANNER (Only in AI modes) ─── */}
      {aiKeyMissing && engineMode !== "rules" && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 flex-1">
            <h4 className="font-semibold text-amber-300">AI Provider Key Required for Full AI Mode</h4>
            <p className="text-neutral-300 leading-relaxed">
              To use Full AI mode, add your Google Gemini or OpenAI API key to{" "}
              <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono text-[11px]">
                Backend/.env
              </code>
              , or switch to the <strong>Rule-based</strong> mode above which requires no API keys:
            </p>
            <pre className="p-2 rounded bg-black/60 font-mono text-[11px] text-neutral-300 overflow-x-auto">
              GEMINI_API_KEY=your_gemini_api_key_here
              {"\n"}# OR
              {"\n"}OPENAI_API_KEY=your_openai_api_key_here
            </pre>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {errorMessage && !aiKeyMissing && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <h4 className="font-semibold text-rose-300">Notice</h4>
            <p className="text-neutral-300 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-neutral-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ─── 4. GENERATION PROGRESS BAR ─── */}
      {isGenerating && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#121216] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <Sparkles className="w-4 h-4 animate-spin" />
              {generationStep || "Generating code fixes..."}
            </span>
            <span className="text-[11px] font-mono text-neutral-400">Processing...</span>
          </div>
          <div className="w-full h-1.5 bg-[#1E1E24] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-pulse rounded-full w-3/4 transition-all duration-500" />
          </div>
        </div>
      )}

      {/* ─── 5. SUMMARY STATS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216]">
          <div className="text-neutral-400 text-[11px] font-medium uppercase tracking-wider">Total Fixes</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Automated patches</div>
        </div>
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216]">
          <div className="text-amber-400 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Needs Review
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.proposed}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Pending check</div>
        </div>
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216]">
          <div className="text-emerald-400 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.approved}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Ready for PR staging</div>
        </div>
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216]">
          <div className="text-rose-400 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats.rejected}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Dismissed</div>
        </div>
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216]">
          <div className="text-orange-400 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            Manual Fix
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-1">{stats.manual || 0}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Custom layout/snippet</div>
        </div>
      </div>

      {/* ─── 6. EMPTY / CALLOUT STATES ─── */}
      {!hasAudit && (
        <div className="p-8 rounded-xl border border-[#22222A] bg-[#121216] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-[#2E2E38] flex items-center justify-center mx-auto text-neutral-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-white">No SEO Audit Found</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The Code Fix Engine converts real issues detected from your deployed website into framework-specific code
              patches. Run an SEO Audit first to analyze your site.
            </p>
          </div>
          {onNavigateToAudit && (
            <button
              onClick={onNavigateToAudit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors"
            >
              <span>Run SEO Audit Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {hasAudit && fixes.length === 0 && !isLoading && (
        <div className="p-8 rounded-xl border border-dashed border-[#2E2E38] bg-[#121216]/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-white">
              {auditPendingIssuesCount} SEO Issue(s) Detected & Ready to Fix
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              MetaMend is ready to inspect your {analysisData?.framework?.name || "repository"} structure, target the
              appropriate files, and generate surgical source code fixes.
            </p>
          </div>
          <button
            onClick={() => handleGenerateFixes()}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate All Code Fixes ({auditPendingIssuesCount} Issues)</span>
          </button>
        </div>
      )}

      {/* ─── 7. FILTERS & SEARCH BAR ─── */}
      {fixes.length > 0 && (
        <div className="p-4 rounded-xl border border-[#22222A] bg-[#121216] space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All Fixes", count: stats.total },
                { id: "proposed", label: "Needs Review", count: stats.proposed },
                { id: "approved", label: "Approved", count: stats.approved },
                { id: "rejected", label: "Rejected", count: stats.rejected },
                { id: "manual", label: "Manual", count: stats.manual || 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${statusFilter === tab.id
                    ? "bg-emerald-500 text-black font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-white bg-[#18181D] hover:bg-[#1E1E24]"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? "bg-black/20 text-black" : "bg-[#22222A] text-neutral-400"
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search and Select Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Filter by issue or file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {availableCategories.length > 1 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-lg bg-[#18181D] border border-[#2E2E38] text-neutral-300 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg bg-[#18181D] border border-[#2E2E38] text-neutral-300 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. CODE FIX CARDS LIST ─── */}
      <div className="space-y-4">
        {filteredFixes.map((fix) => {
          const isExpanded = !!expandedCards[fix._id];
          const viewMode = diffViewMode[fix._id] || "split";
          const isActionLoading = actionLoadingId === fix._id;

          const severityStyles = {
            critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
            medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            info: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
          }[fix.severity || "medium"];

          const statusBadge = {
            proposed: {
              label: "Needs Review",
              style: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            },
            approved: {
              label: "Approved",
              style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            },
            rejected: {
              label: "Rejected",
              style: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            },
            manual: {
              label: "Manual Fix Needed",
              style: "bg-orange-500/10 text-orange-400 border-orange-500/20",
            },
            stale: {
              label: "File changed on GitHub · Regenerate",
              style: "bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold",
            },
            published: {
              label: "Published",
              style: "bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold",
            },
          }[fix.status || "proposed"] || {
            label: fix.status,
            style: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
          };

          const confidenceStyles = {
            high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            low: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          }[fix.confidence || "high"];

          const hasPlaceholders = Array.isArray(fix.placeholders) && fix.placeholders.length > 0;
          const isManual = fix.status === "manual" || !!fix.manualSnippet;

          return (
            <div
              key={fix._id}
              className={`rounded-xl border transition-all ${fix.status === "approved"
                ? "border-emerald-500/30 bg-[#121216]"
                : fix.status === "rejected"
                  ? "border-rose-500/20 bg-[#121216]/80 opacity-90"
                  : isManual
                    ? "border-orange-500/30 bg-[#121216]"
                    : "border-[#22222A] bg-[#121216] hover:border-[#2E2E38]"
                }`}
            >
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(fix._id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity */}
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${severityStyles}`}
                    >
                      {fix.severity}
                    </span>

                    {/* Category */}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {fix.issueCategory}
                    </span>

                    {/* Engine Badge */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 font-semibold">
                      {fix.engine === "ai" ? "Full AI" : "Rule Engine (AST)"}
                    </span>

                    {/* Confidence Badge */}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border capitalize ${confidenceStyles}`}>
                      Confidence: {fix.confidence || "high"}
                    </span>

                    {/* Placeholder Warning Badge */}
                    {hasPlaceholders && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/15 text-amber-300 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Needs your input ({fix.placeholders.length})
                      </span>
                    )}

                    {/* Target File Badge */}
                    <span className="text-[11px] font-mono flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181D] border border-[#2E2E38] text-neutral-300">
                      <FileCode className="w-3 h-3 text-emerald-400" />
                      <span>{fix.patch?.filePath}</span>
                    </span>

                    {/* Operation Badge */}
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${
                        (fix.operation === "create" || fix.patch?.action === "create")
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {(fix.operation === "create" || fix.patch?.action === "create") ? "CREATE" : "MODIFY"}
                    </span>

                    {/* Bootstrap Badge */}
                    {fix.isBootstrap && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                        BOOTSTRAP
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ml-auto md:ml-0 ${statusBadge.style}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    {fix.issueTitle}
                  </h3>

                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {fix.analysis?.rootCause || fix.analysis?.explanation}
                  </p>
                </div>

                {/* Metrics & Expand toggle */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-end gap-2">
                      <span className="text-emerald-400">+{fix.patch?.additions || 0}</span>
                      <span className="text-rose-400">-{fix.patch?.deletions || 0}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      Risk:{" "}
                      <span
                        className={
                          fix.analysis?.risk === "low"
                            ? "text-emerald-400 font-semibold uppercase"
                            : fix.analysis?.risk === "high"
                              ? "text-rose-400 font-semibold uppercase"
                              : "text-amber-400 font-semibold uppercase"
                        }
                      >
                        {fix.analysis?.risk || "low"}
                      </span>
                    </div>
                  </div>

                  <button className="p-1 rounded text-neutral-400 hover:text-white">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Card Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#1E1E24] space-y-5">
                  {/* Explanations & Risk Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-lg bg-[#18181D] border border-[#22222A] space-y-1.5">
                      <h4 className="font-semibold text-white flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-emerald-400" />
                        Root Cause & What This Fix Does
                      </h4>
                      <p className="text-neutral-400 leading-relaxed">
                        {fix.analysis?.explanation || "Updates file to introduce standardized technical SEO metadata."}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-[#18181D] border border-[#22222A] space-y-1.5">
                      <h4 className="font-semibold text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Risk Assessment & Framework Compliance
                      </h4>
                      <p className="text-neutral-400 leading-relaxed">
                        {fix.analysis?.riskAssessment || "Low risk deterministic AST patch. Verified framework compliance."}
                      </p>
                      {fix.framework && (
                        <div className="text-[10px] font-mono text-neutral-400 pt-1">
                          Framework: {fix.framework.name} {fix.framework.version} ({fix.framework.router || "standard"}
                          )
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── WHAT CHANGED AND WHY LIST ─── */}
                  {Array.isArray(fix.changes) && fix.changes.length > 0 && (
                    <div className="p-4 rounded-lg bg-[#141419] border border-[#22222A] space-y-2 text-xs">
                      <h4 className="font-semibold text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        What changed and why:
                      </h4>
                      <div className="space-y-1.5">
                        {fix.changes.map((c, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-neutral-300">
                            <span className="text-emerald-400 font-mono text-[10px] mt-0.5">•</span>
                            <div>
                              <span className="font-medium text-white">{c.description} </span>
                              <span className="text-neutral-400 italic">({c.reason})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── MANUAL SNIPPET CARD (If status is manual) ─── */}
                  {isManual && fix.manualSnippet && (
                    <div className="p-4 rounded-lg bg-[#18181D] border border-orange-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-orange-300 flex items-center gap-2 text-xs">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          Manual Fix Needed (Copyable Snippet)
                        </h4>
                        <button
                          onClick={() => handleCopyCode(fix.manualSnippet, `${fix._id}-snippet`)}
                          className="px-2.5 py-1 rounded bg-[#202028] hover:bg-[#282832] text-neutral-200 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === `${fix._id}-snippet` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Snippet</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {fix.analysis?.explanation || "This component structure requires manual snippet insertion to prevent syntax collisions."}
                      </p>
                      <pre className="p-3 rounded bg-black/60 font-mono text-[11px] text-orange-200 overflow-x-auto leading-relaxed border border-orange-500/20">
                        {fix.manualSnippet}
                      </pre>
                    </div>
                  )}

                  {/* ─── PLACEHOLDER EDITING FORM ─── */}
                  {hasPlaceholders && (
                    <div className="p-4 rounded-lg bg-[#16161D] border border-amber-500/30 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          Customize Missing Fields (No fake copy used)
                        </h4>
                        <span className="text-[10px] text-neutral-400">Overrides will be saved into AST</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                            Title Override (30-60 chars)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. MetaMend | Automated SEO Code Remediation"
                            value={placeholderOverrides[fix._id]?.title || ""}
                            onChange={(e) =>
                              setPlaceholderOverrides((prev) => ({
                                ...prev,
                                [fix._id]: { ...prev[fix._id], title: e.target.value },
                              }))
                            }
                            className="w-full text-xs p-2 rounded bg-[#0E0E12] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                            Description Override (120-160 chars)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Audit live deployed websites and generate surgical SEO pull requests..."
                            value={placeholderOverrides[fix._id]?.description || ""}
                            onChange={(e) =>
                              setPlaceholderOverrides((prev) => ({
                                ...prev,
                                [fix._id]: { ...prev[fix._id], description: e.target.value },
                              }))
                            }
                            className="w-full text-xs p-2 rounded bg-[#0E0E12] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRegenerateSubmit(fix._id, placeholderOverrides[fix._id])}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-run Rule with Overrides</span>
                      </button>
                    </div>
                  )}

                  {/* Rejection Reason Notice if Rejected */}
                  {fix.status === "rejected" && fix.rejectionReason && (
                    <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Rejection Feedback: </span>
                        {fix.rejectionReason}
                      </div>
                    </div>
                  )}

                  {/* ─── CODE DIFF VIEWER (Shown for applied fixes) ─── */}
                  {!isManual && (
                    <div className="rounded-lg border border-[#22222A] bg-[#0E0E12] overflow-hidden space-y-0">
                      {/* Diff Header / View Switcher */}
                      <div className="p-3 bg-[#16161C] border-b border-[#22222A] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white text-[11px] flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                            {fix.patch?.filePath}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">+{fix.patch?.additions || 0}</span>
                          <span className="text-[10px] font-mono text-rose-400">-{fix.patch?.deletions || 0}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Split / Unified */}
                          <button
                            onClick={() => toggleDiffMode(fix._id)}
                            className="px-2 py-1 rounded bg-[#202028] hover:bg-[#282832] text-neutral-300 text-[11px] flex items-center gap-1 transition-colors"
                            title="Toggle Diff View"
                          >
                            {viewMode === "split" ? (
                              <>
                                <Columns className="w-3 h-3 text-emerald-400" />
                                <span>Split View</span>
                              </>
                            ) : (
                              <>
                                <List className="w-3 h-3 text-emerald-400" />
                                <span>Unified Diff</span>
                              </>
                            )}
                          </button>

                          {/* Copy Code */}
                          <button
                            onClick={() => handleCopyCode(fix.patch?.proposedContent, fix._id)}
                            className="px-2 py-1 rounded bg-[#202028] hover:bg-[#282832] text-neutral-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedId === fix._id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Proposed</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Diff Body */}
                      {viewMode === "unified" ? (
                        /* Unified Diff View */
                        <div className="p-4 overflow-x-auto max-h-96 font-mono text-[11px] leading-relaxed">
                          {fix.patch?.diff?.split("\n").map((line, idx) => {
                            const isAdd = line.startsWith("+") && !line.startsWith("+++");
                            const isDel = line.startsWith("-") && !line.startsWith("---");
                            const isHeader = line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++");

                            return (
                              <div
                                key={idx}
                                className={`px-2 py-0.5 rounded-xs ${isAdd
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : isDel
                                    ? "bg-rose-500/15 text-rose-300"
                                    : isHeader
                                      ? "text-neutral-500 bg-[#16161C]/50"
                                      : "text-neutral-300"
                                  }`}
                              >
                                {line || " "}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Side-by-Side Split View */
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#22222A] max-h-96 overflow-y-auto">
                          {/* Left: Original Code */}
                          <div className="p-4 overflow-x-auto">
                            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Original Content</span>
                              <span>{fix.patch?.action === "create" ? "(New file)" : "Current"}</span>
                            </div>
                            <pre className="font-mono text-[11px] text-neutral-400 whitespace-pre leading-relaxed">
                              {fix.patch?.originalContent || "// (File currently does not exist)"}
                            </pre>
                          </div>

                          {/* Right: Proposed Code */}
                          <div className="p-4 overflow-x-auto bg-[#0A0F0D]">
                            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Proposed Patch</span>
                              <span>AST Verified</span>
                            </div>
                            <pre className="font-mono text-[11px] text-emerald-200 whitespace-pre leading-relaxed">
                              {fix.patch?.proposedContent}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── ACTION CONTROLS ─── */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-neutral-400">
                      {fix.status === "approved" ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Approved on {new Date(fix.approvedAt || fix.updatedAt).toLocaleDateString()}
                        </span>
                      ) : fix.status === "rejected" ? (
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <XCircle className="w-4 h-4" />
                          Rejected on {new Date(fix.rejectedAt || fix.updatedAt).toLocaleDateString()}
                        </span>
                      ) : isManual ? (
                        <span className="text-orange-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Requires manual integration
                        </span>
                      ) : (
                        <span className="text-neutral-400">Status: Pending developer review</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Reject Button */}
                      {fix.status !== "rejected" && (
                        <button
                          onClick={() => {
                            setRejectingFixId(fix._id);
                            setRejectionReason("");
                          }}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      )}

                      {/* Regenerate Button */}
                      <button
                        onClick={() => {
                          setRegeneratingFixId(fix._id);
                          setRegeneratePrompt("");
                        }}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 rounded-lg border border-[#2E2E38] hover:bg-[#1E1E24] text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                        <span>Regenerate</span>
                      </button>

                      {/* Approve Button */}
                      {fix.status !== "approved" && !isManual && (
                        <button
                          onClick={() => handleApprove(fix._id)}
                          disabled={isActionLoading}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Fix</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── 9. REJECTION REASON MODAL ─── */}
      {rejectingFixId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#22222A] bg-[#121216] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Reject Code Fix
            </h3>
            <p className="text-xs text-neutral-400">
              Please specify why this code fix is being rejected. This feedback helps improve future generations.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Target file is incorrect, or we prefer a different metadata architecture..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full text-xs p-3 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingFixId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 10. REGENERATE GUIDANCE MODAL ─── */}
      {regeneratingFixId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#22222A] bg-[#121216] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Regenerate Code Fix
            </h3>
            <p className="text-xs text-neutral-400">
              {engineMode === "rules"
                ? "In Rule-based mode, code patches are generated deterministically via AST. You can configure custom title or description overrides below."
                : "Provide optional guidance or instructions for the fix generator."}
            </p>

            {engineMode === "rules" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                    Custom Title Override
                  </label>
                  <input
                    type="text"
                    placeholder="Enter custom title..."
                    value={placeholderOverrides[regeneratingFixId]?.title || ""}
                    onChange={(e) =>
                      setPlaceholderOverrides((prev) => ({
                        ...prev,
                        [regeneratingFixId]: { ...prev[regeneratingFixId], title: e.target.value },
                      }))
                    }
                    className="w-full text-xs p-2.5 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                    Custom Description Override
                  </label>
                  <input
                    type="text"
                    placeholder="Enter custom description..."
                    value={placeholderOverrides[regeneratingFixId]?.description || ""}
                    onChange={(e) =>
                      setPlaceholderOverrides((prev) => ({
                        ...prev,
                        [regeneratingFixId]: { ...prev[regeneratingFixId], description: e.target.value },
                      }))
                    }
                    className="w-full text-xs p-2.5 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <textarea
                rows={3}
                placeholder="e.g. Ensure twitter card is summary_large_image and include openGraph.siteName..."
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                className="w-full text-xs p-3 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none focus:border-emerald-500"
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRegeneratingFixId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerateSubmit(regeneratingFixId)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Regenerate Fix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 11. STICKY REVIEW & PUBLISH FOOTER BAR (FEATURE 5) ─── */}
      {fixes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
          <div className="p-3.5 rounded-2xl border border-[#2E2E38] bg-[#121216]/95 backdrop-blur-md shadow-2xl flex items-center justify-between gap-4 pointer-events-auto">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-white">Review Progress:</span>
              <div className="flex items-center gap-2 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {stats.approved} Approved
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {stats.rejected} Rejected
                </span>
                {stats.manual > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {stats.manual} Need Input
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPublishModal(true)}
              disabled={stats.approved === 0}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Create Pull Request ({stats.approved})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 12. PUBLISH MODAL (FEATURE 5) ─── */}
      <PublishPanel
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        fixes={fixes}
        repoFullName={repoFullName}
        defaultBranch={repoDetails?.repo?.defaultBranch || "main"}
        token={token}
        onPublishSuccess={() => {
          loadFixes();
        }}
        onNavigateToAudit={onNavigateToAudit}
      />
    </div>
  );
}
