import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { Navbar } from "./Navbar";
import { RepositoryAnalysis } from "./RepositoryAnalysis";
import { SeoAuditReport } from "./SeoAuditReport";
import { SocialPreviews } from "./SocialPreviews";
import {
  LayoutGrid,
  Search,
  AlignLeft,
  GitPullRequest,
  Eye,
  Activity,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Settings,
  Star,
  GitFork,
  Globe,
} from "lucide-react";

export const Dashboard = () => {
  const { user, token, loginWithGithub } = useAuth();

  // ─── 1. ROUTING STATE ───────────────────────────────────────────────────────
  const getHashRoute = () => {
    const clean = window.location.hash.replace(/^#\/?/, "");
    const parts = clean.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "dashboard") {
      return {
        isProjectView: true,
        repoSlug: decodeURIComponent(parts[1]),
        activeTab: parts[2] || "overview",
      };
    }
    return {
      isProjectView: false,
      repoSlug: null,
      activeTab: "overview",
    };
  };

  const [route, setRoute] = useState(getHashRoute);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getHashRoute());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateToHash = (newHash) => {
    window.location.hash = newHash;
  };

  // ─── 2. PROJECTS LIST STATE ─────────────────────────────────────────────────
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("metamend_created_projects") || "[]");
    } catch {
      return [];
    }
  });

  const [repos, setRepos] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState(null);
  const [requiresGithubReconnect, setRequiresGithubReconnect] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Projects");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form states for creating a project
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");
  const [selectedRepoForNew, setSelectedRepoForNew] = useState("");

  // Fetch GitHub repos for picker (with proxy fallback + explicit error reporting)
  const fetchRepos = useCallback(async () => {
    if (!token) {
      setReposError("Please sign in with GitHub to load your repositories.");
      setRequiresGithubReconnect(true);
      return;
    }

    setIsLoadingRepos(true);
    setReposError(null);

    try {
      let res;
      try {
        res = await fetch("/api/user/repos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status >= 500) throw new Error("Proxy failed");
      } catch {
        res = await fetch("http://localhost:5000/api/user/repos", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReposError(data.message || `Failed to load repositories (HTTP ${res.status}).`);
        if (res.status === 401) setRequiresGithubReconnect(true);
        return;
      }

      if (data.success && Array.isArray(data.repos)) {
        setRepos(data.repos);
        setRequiresGithubReconnect(Boolean(data.requiresGithubReconnect));
        if (data.warning) {
          setReposError(data.warning);
        } else if (data.repos.length === 0 && data.message) {
          setReposError(data.message);
        }
      } else {
        setReposError(data.message || "Unable to fetch repositories.");
      }
    } catch (err) {
      console.warn("Could not fetch user repos:", err.message);
      setReposError("Could not connect to backend server to fetch GitHub repositories.");
    } finally {
      setIsLoadingRepos(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    if (token) {
      const timer = setTimeout(() => {
        if (active) {
          fetchRepos();
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [token, fetchRepos]);

  // Create Project & Navigate to /dashboard/{repo name}
  const handleCreateNewProject = (e) => {
    e.preventDefault();
    const matchedRepo = repos.find(
      (r) => r.fullName === selectedRepoForNew || r.name === selectedRepoForNew
    );
    const name = newProjectName.trim() || matchedRepo?.name || selectedRepoForNew || "My project";
    const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    const rawUrl = newProjectUrl.trim();
    const formattedUrl = rawUrl
      ? rawUrl.startsWith("http")
        ? rawUrl
        : `https://${rawUrl}`
      : matchedRepo?.homepage || "";

    const newProj = {
      id: Date.now(),
      name,
      fullName: matchedRepo?.fullName || name,
      slug,
      url: formattedUrl,
      branch: matchedRepo?.defaultBranch || "main",
      framework: matchedRepo?.language || "Web App",
      createdAt: new Date().toLocaleDateString(),
      status: "unverified",
      hasAudited: false,
    };

    const updated = [newProj, ...projects];
    setProjects(updated);
    try {
      localStorage.setItem("metamend_created_projects", JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }

    setShowNewModal(false);
    setNewProjectName("");
    setNewProjectUrl("");
    setSelectedRepoForNew("");
    setRepoSearch("");

    // Redirect to /dashboard/{repo name}
    navigateToHash(`dashboard/${slug}`);
  };

  const handleDeleteProject = (id, e) => {
    e.stopPropagation();
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    try {
      localStorage.setItem("metamend_created_projects", JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── 3. ACTIVE PROJECT RESOLUTION ───────────────────────────────────────────
  const activeProject = useMemo(() => {
    if (!route.repoSlug) return null;
    const found = projects.find(
      (p) =>
        p.slug === route.repoSlug ||
        p.name.toLowerCase() === route.repoSlug.toLowerCase()
    );
    if (found) return found;

    return {
      id: "adhoc",
      name: route.repoSlug,
      slug: route.repoSlug,
      url: "",
      branch: "main",
      framework: "Next.js",
      createdAt: "Today",
      status: "unverified",
      hasAudited: false,
    };
  }, [projects, route.repoSlug]);

  // ─── 4. REAL BACKEND REPO OVERVIEW & AUDIT STATE ────────────────────────────
  const [repoDetails, setRepoDetails] = useState(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  // Pull Requests and Fixes local memory
  const [fixForm, setFixForm] = useState({
    title: "",
    description: "",
    keywords: "",
    ogImageUrl: "",
  });
  const [createdPRs, setCreatedPRs] = useState([]);

  // ─── 4B. REPOSITORY ANALYSIS & FRAMEWORK DETECTION STATE (FEATURE 1) ────────
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);

  const runRepositoryAnalysis = useCallback(
    async (slug) => {
      if (!slug || !token) return;
      setIsAnalyzingRepo(true);
      setAnalysisStep(1);

      const stepTimer = setInterval(() => {
        setAnalysisStep((prev) => (prev < 6 ? prev + 1 : prev));
      }, 500);

      try {
        const res = await fetch("/api/analysis/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ repo: slug }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setAnalysisStep(7);
            setAnalysisData(data.data);
          }
        }
      } catch (err) {
        console.warn("Analysis failed:", err.message);
      } finally {
        clearInterval(stepTimer);
        setTimeout(() => {
          setIsAnalyzingRepo(false);
        }, 400);
      }
    },
    [token]
  );

  const loadExistingAnalysis = useCallback(
    async (slug) => {
      if (!slug || !token) return;
      try {
        const res = await fetch(`/api/analysis?repo=${encodeURIComponent(slug)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setAnalysisData(data.data);
            return;
          }
        }
        runRepositoryAnalysis(slug);
      } catch {
        runRepositoryAnalysis(slug);
      }
    },
    [token, runRepositoryAnalysis]
  );

  // ─── 4C. LIVE WEBSITE CRAWLER & SEO AUDIT STATE (FEATURE 2) ─────────────────
  const [liveAuditData, setLiveAuditData] = useState(null);
  const [isLoadingLiveAudit, setIsLoadingLiveAudit] = useState(false);
  const [isRunningLiveAudit, setIsRunningLiveAudit] = useState(false);
  const [liveAuditStep, setLiveAuditStep] = useState(1);
  const [liveAuditError, setLiveAuditError] = useState(null);

  // Load latest audit from database (strictly scoped to current repo slug)
  const loadLatestAudit = useCallback(
    async (slug) => {
      if (!slug || !token) return;
      setIsLoadingLiveAudit(true);
      try {
        const res = await fetch(
          `/api/audit/latest?projectId=${encodeURIComponent(slug)}&repo=${encodeURIComponent(slug)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.audit) {
            setLiveAuditData(data.audit);
          } else {
            setLiveAuditData(null);
          }
        } else {
          setLiveAuditData(null);
        }
      } catch (err) {
        console.warn("Could not load latest audit:", err.message);
        setLiveAuditData(null);
      } finally {
        setIsLoadingLiveAudit(false);
      }
    },
    [token]
  );

  // ─── 4D. VISUAL SOCIAL & SEARCH PREVIEWS STATE (FEATURE 3) ──────────────────
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  const loadProjectPreviews = useCallback(
    async (slug) => {
      if (!slug || !token) return;
      setIsLoadingPreviews(true);
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(slug)}/previews?repo=${encodeURIComponent(slug)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPreviewData(data);
          } else {
            setPreviewData(null);
          }
        } else {
          setPreviewData(null);
        }
      } catch (err) {
        console.warn("Could not load social previews:", err.message);
        setPreviewData(null);
      } finally {
        setIsLoadingPreviews(false);
      }
    },
    [token]
  );

  // Execute live website crawl and audit
  const runLiveAudit = useCallback(
    async (customUrl = null) => {
      if (!route.repoSlug || !token) return;
      setIsRunningLiveAudit(true);
      setLiveAuditError(null);
      setLiveAuditStep(1);

      // Realistic progress step progression
      const stepInterval = setInterval(() => {
        setLiveAuditStep((prev) => (prev < 11 ? prev + 1 : prev));
      }, 700);

      try {
        const candidateProjectUrl =
          activeProject?.url && !/^https?:\/\/(www\.)?github\.com\//i.test(activeProject.url)
            ? activeProject.url
            : "";
        const candidateHomepage =
          repoDetails?.repo?.homepage ||
          analysisData?.repository?.homepage ||
          analysisData?.deployment?.deploymentUrl ||
          "";
        const safeHomepage = /^https?:\/\/(www\.)?github\.com\//i.test(candidateHomepage)
          ? ""
          : candidateHomepage;
        const targetUrl = customUrl || candidateProjectUrl || safeHomepage || "";

        const res = await fetch("/api/audit/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId: route.repoSlug,
            repo: route.repoSlug,
            url: targetUrl,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.audit) {
          setLiveAuditStep(12);
          setLiveAuditData(data.audit);
          setLiveAuditError(null);
          loadProjectPreviews(route.repoSlug);
        } else {
          setLiveAuditError(data.message || "Could not complete SEO audit for this repository.");
        }
      } catch (err) {
        console.warn("Audit execution failed:", err.message);
        setLiveAuditError(err.message || "Network error while executing SEO audit.");
      } finally {
        clearInterval(stepInterval);
        setTimeout(() => {
          setIsRunningLiveAudit(false);
        }, 500);
      }
    },
    [token, route.repoSlug, activeProject, repoDetails, analysisData, loadProjectPreviews]
  );

  // Fetch real repository inspection from backend
  const loadRepoDetails = useCallback(
    async (slug, customUrl) => {
      if (!slug) return;
      setIsLoadingRepo(true);
      try {
        const queryParams = new URLSearchParams({
          repo: slug,
          url: customUrl || "",
        });

        const res = await fetch(`/api/user/repo-overview?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRepoDetails(data);
            setFixForm({
              title: data.audit?.metadata?.title || data.repo?.name || "",
              description: data.audit?.metadata?.description || data.repo?.description || "",
              keywords: "",
              ogImageUrl: data.audit?.metadata?.ogImage || "",
            });
          }
        }
      } catch (err) {
        console.warn("Could not load repo overview from backend:", err.message);
      } finally {
        setIsLoadingRepo(false);
      }
    },
    [token]
  );

  useEffect(() => {
    let active = true;
    if (route.isProjectView && route.repoSlug) {
      const activeUrl = activeProject?.url || "";
      const timer = setTimeout(() => {
        if (active) {
          setLiveAuditData(null);
          setLiveAuditError(null);
          setPreviewData(null);
          setAnalysisData(null);
          setRepoDetails(null);
          loadRepoDetails(route.repoSlug, activeUrl);
          loadExistingAnalysis(route.repoSlug);
          loadLatestAudit(route.repoSlug);
          loadProjectPreviews(route.repoSlug);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [route.isProjectView, route.repoSlug, activeProject?.url, loadRepoDetails, loadExistingAnalysis, loadLatestAudit, loadProjectPreviews]);

  // Re-run Audit button
  const handleRunAudit = async () => {
    if (!activeProject) return;
    setIsAuditing(true);
    setAuditProgress(20);

    const timer = setInterval(() => {
      setAuditProgress((p) => {
        if (p >= 90) {
          clearInterval(timer);
          return 95;
        }
        return p + 25;
      });
    }, 200);

    try {
      await loadRepoDetails(activeProject.slug, activeProject.url);
      setAuditProgress(100);
    } finally {
      setTimeout(() => {
        clearInterval(timer);
        setIsAuditing(false);
        setAuditProgress(0);
      }, 400);
    }
  };

  // Pull Request Action
  const handleCreatePR = () => {
    if (!activeProject) return;
    const newPR = {
      id: Date.now(),
      number: createdPRs.length + 1,
      title: `Fix metadata, canonical tags, and OpenGraph for ${repoDetails?.repo?.name || activeProject.name}`,
      branch: "metamend/seo-fixes",
      createdAt: "Just now",
      status: "Open",
      filesChanged: 2,
      additions: 24,
      deletions: 2,
    };
    setCreatedPRs([newPR, ...createdPRs]);
  };

  // UI States
  const [isCopiedBadge, setIsCopiedBadge] = useState(false);
  const [actionToggle, setActionToggle] = useState(true);

  const copyMarkdownBadge = () => {
    if (!activeProject) return;
    navigator.clipboard?.writeText(
      `[![MetaMend SEO](https://metamend.dev/badge/${user?.username || "user"}/${activeProject.slug}.svg)](https://metamend.dev)`
    );
    setIsCopiedBadge(true);
    setTimeout(() => setIsCopiedBadge(false), 2000);
  };

  const frameworkName = analysisData?.framework?.name || repoDetails?.repo?.framework || activeProject?.framework || "Web Application";
  const detectedWebsiteUrl =
    (activeProject?.url && !/^https?:\/\/(www\.)?github\.com\//i.test(activeProject.url) ? activeProject.url : "") ||
    (repoDetails?.repo?.homepage && !/^https?:\/\/(www\.)?github\.com\//i.test(repoDetails.repo.homepage) ? repoDetails.repo.homepage : "") ||
    (analysisData?.repository?.homepage && !/^https?:\/\/(www\.)?github\.com\//i.test(analysisData.repository.homepage) ? analysisData.repository.homepage : "") ||
    analysisData?.deployment?.deploymentUrl ||
    "";

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#E0E0E0] flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      {/* ─── 1. NAVBAR (PRESERVED) ─────────────────────────────────────── */}
      <Navbar />

      {/* ─── 2. WORKSPACE LAYOUT (Below fixed navbar) ────────────────── */}
      <div className="flex-1 flex pt-16 min-h-[calc(100vh-4rem)]">
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEFT SIDEBAR                                                 */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <aside
          className={`bg-[#0B0B0D] border-r border-[#1E1E23] flex flex-col justify-between shrink-0 transition-all duration-200 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar z-20 ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          {route.isProjectView && activeProject ? (
            /* ───────────────────────────────────────────────────────── */
            /* CASE A: PROJECT WORKSPACE SIDEBAR (Matched to screenshot) */
            /* ───────────────────────────────────────────────────────── */
            <div className="flex flex-col h-full justify-between">
              <div>
                {/* 1. Back link to All Projects */}
                <div className="p-3 border-b border-[#1E1E23]">
                  <button
                    onClick={() => navigateToHash("dashboard")}
                    className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white font-medium transition-colors cursor-pointer w-full"
                    title="Back to all projects"
                  >
                    <ArrowLeft size={14} strokeWidth={1.5} />
                    {!isSidebarCollapsed && <span>All projects</span>}
                  </button>
                </div>

                {/* 2. Active Project Info Header */}
                {!isSidebarCollapsed && (
                  <div className="px-4 py-3 border-b border-[#1E1E23] bg-[#121216]/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs truncate max-w-[170px]">
                        {repoDetails?.repo?.name || activeProject.name}
                      </span>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                        {repoDetails?.repo?.defaultBranch || activeProject.branch}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                      {frameworkName}
                    </p>
                  </div>
                )}

                {/* 3. Navigation Groups (LOOK, FIX, TRACK) */}
                <nav className="p-3 space-y-5 select-none" aria-label="Project Workspace Navigation">
                  {/* ─── GROUP: LOOK ─── */}
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                        LOOK
                      </div>
                    )}

                    {/* Overview */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/overview`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "overview"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Overview"
                    >
                      <div className="flex items-center gap-3">
                        <LayoutGrid size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Overview</span>}
                      </div>
                    </button>

                    {/* Audit results */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/audit`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "audit"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Audit results"
                    >
                      <div className="flex items-center gap-3">
                        <Search size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Audit results</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-mono text-neutral-400">
                          {liveAuditData?.audit?.totalIssues ?? 0}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ─── GROUP: FIX ─── */}
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                        FIX
                      </div>
                    )}

                    {/* Fixes */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/fixes`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "fixes"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Fixes"
                    >
                      <div className="flex items-center gap-3">
                        <AlignLeft size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Fixes</span>}
                      </div>
                    </button>

                    {/* Pull requests */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/pull-requests`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "pull-requests"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Pull requests"
                    >
                      <div className="flex items-center gap-3">
                        <GitPullRequest size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Pull requests</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-mono text-neutral-400">
                          {createdPRs.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ─── GROUP: TRACK ─── */}
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                        TRACK
                      </div>
                    )}

                    {/* Previews */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/previews`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "previews"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Previews"
                    >
                      <div className="flex items-center gap-3">
                        <Eye size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Previews</span>}
                      </div>
                    </button>

                    {/* Monitoring */}
                    <button
                      onClick={() => navigateToHash(`dashboard/${route.repoSlug}/monitoring`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        route.activeTab === "monitoring"
                          ? "bg-white/[0.08] text-white font-semibold"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Monitoring"
                    >
                      <div className="flex items-center gap-3">
                        <Activity size={16} strokeWidth={1.8} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Monitoring</span>}
                      </div>
                    </button>
                  </div>
                </nav>
              </div>

              {/* Bottom: Settings & Collapse */}
              <div className="p-3 border-t border-[#1E1E23] space-y-1">
                <button
                  onClick={() => navigateToHash(`dashboard/${route.repoSlug}/settings`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    route.activeTab === "settings"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                  title="Settings"
                >
                  <Settings size={15} strokeWidth={1.5} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Project settings</span>}
                </button>

                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  title={isSidebarCollapsed ? "Expand" : "Collapse"}
                >
                  <svg
                    className={`w-4 h-4 shrink-0 transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  {!isSidebarCollapsed && <span>Collapse</span>}
                </button>
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* CASE B: ALL PROJECTS MAIN DASHBOARD SIDEBAR               */
            /* ───────────────────────────────────────────────────────── */
            <>
              <div>
                <nav className="p-3 space-y-6">
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveNav("Projects")}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeNav === "Projects"
                          ? "bg-white/[0.08] text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Projects"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4a2 2 0 100-4 2 2 0 000 4zM6 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4zM12 4v6m0 0l-5 5m5-5l5 5" />
                      </svg>
                      {!isSidebarCollapsed && <span>Projects</span>}
                    </button>

                    <button
                      onClick={() => setActiveNav("Blueprints")}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeNav === "Blueprints"
                          ? "bg-white/[0.08] text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Blueprints"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      {!isSidebarCollapsed && <span>Blueprints</span>}
                    </button>

                    <button
                      onClick={() => setActiveNav("Environment Groups")}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeNav === "Environment Groups"
                          ? "bg-white/[0.08] text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                      title="Environment Groups"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {!isSidebarCollapsed && <span>Environment Groups</span>}
                    </button>
                  </div>
                </nav>
              </div>

              <div className="p-3 border-t border-[#1E1E23] space-y-1">
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  title={isSidebarCollapsed ? "Expand" : "Collapse"}
                >
                  <svg
                    className={`w-4 h-4 shrink-0 transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  {!isSidebarCollapsed && <span>Collapse</span>}
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* MAIN CONTENT AREA                                            */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {route.isProjectView && activeProject ? (
            /* ───────────────────────────────────────────────────────── */
            /* CASE A: REAL REPOSITORY WORKSPACE VIEW                    */
            /* ───────────────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col min-w-0">
              {/* Subheader */}
              <div className="h-14 border-b border-[#1E1E23] bg-[#0E0E10] px-6 sm:px-10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                  <span className="text-neutral-500 font-mono">dashboard</span>
                  <span className="text-neutral-600">/</span>
                  <span className="text-white font-bold">{repoDetails?.repo?.name || activeProject.name}</span>
                  <span className="text-neutral-600">/</span>
                  <span className="text-neutral-400 capitalize">{route.activeTab}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (route.activeTab === "audit") {
                        runLiveAudit();
                      } else {
                        runRepositoryAnalysis(route.repoSlug);
                        handleRunAudit();
                      }
                    }}
                    disabled={isAuditing || isLoadingRepo || isAnalyzingRepo || isRunningLiveAudit}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isAuditing || isLoadingRepo || isAnalyzingRepo || isRunningLiveAudit ? "animate-spin" : ""} />
                    <span>
                      {isRunningLiveAudit
                        ? `Auditing (${liveAuditStep}/12)`
                        : isAuditing
                        ? `Inspecting (${auditProgress}%)`
                        : isAnalyzingRepo
                        ? "Analyzing repo..."
                        : isLoadingRepo
                        ? "Fetching repo..."
                        : "Re-audit site"}
                    </span>
                  </button>

                  {repoDetails?.repo?.homepage ? (
                    <a
                      href={repoDetails.repo.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="hidden sm:inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
                    >
                      <Globe size={13} />
                      <span>Live Site</span>
                      <ExternalLink size={11} />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Main Content */}
              <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
                {isLoadingRepo && route.activeTab !== "audit" && route.activeTab !== "previews" ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-8 bg-neutral-800 rounded w-1/3" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="h-28 bg-[#121216] border border-[#22222A] rounded-xl" />
                      <div className="h-28 bg-[#121216] border border-[#22222A] rounded-xl" />
                      <div className="h-28 bg-[#121216] border border-[#22222A] rounded-xl" />
                    </div>
                    <div className="h-44 bg-[#121216] border border-[#22222A] rounded-xl" />
                  </div>
                ) : (
                  <>
                    {/* ─── TAB 1: OVERVIEW (REPOSITORY INSPECTION & FRAMEWORK DETECTION) ─── */}
                    {route.activeTab === "overview" && (
                      <RepositoryAnalysis
                        analysisData={analysisData}
                        isAnalyzing={isAnalyzingRepo}
                        currentStep={analysisStep}
                        onReanalyze={() => runRepositoryAnalysis(route.repoSlug)}
                        onStartAudit={() => {
                          navigateToHash(`dashboard/${route.repoSlug}/audit`);
                          runLiveAudit();
                        }}
                      />
                    )}

                    {/* ─── TAB 2: AUDIT RESULTS (LIVE CRAWL & COMPREHENSIVE SEO AUDIT) ─── */}
                    {route.activeTab === "audit" && (
                      <SeoAuditReport
                        repoName={repoDetails?.repo?.fullName || activeProject.name}
                        detectedUrl={detectedWebsiteUrl}
                        auditData={liveAuditData}
                        isLoadingAudit={isLoadingLiveAudit}
                        isRunningAudit={isRunningLiveAudit}
                        auditStep={liveAuditStep}
                        auditError={liveAuditError}
                        onRunAudit={() => runLiveAudit()}
                        onUpdateUrl={(newUrl) => runLiveAudit(newUrl)}
                        onContinueToPreviews={() => navigateToHash(`dashboard/${route.repoSlug}/previews`)}
                      />
                    )}

                    {/* ─── TAB 3: FIXES ─── */}
                    {route.activeTab === "fixes" && (
                      <div className="space-y-6 pb-20">
                        <div>
                          <h1 className="text-2xl font-bold text-white tracking-tight">Fixes & Metadata Editor</h1>
                          <p className="text-xs text-neutral-400 mt-1">
                            Customize page metadata for {repoDetails?.repo?.name || activeProject.name}.
                          </p>
                        </div>

                        <div className="p-6 rounded-xl border border-[#22222A] bg-[#121216] space-y-4">
                          <h2 className="text-base font-bold text-white">Root Page Metadata</h2>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                  Title Tag
                                </label>
                                <span className="text-[11px] font-mono text-neutral-400">
                                  {fixForm.title.length}/60 chars
                                </span>
                              </div>
                              <input
                                type="text"
                                value={fixForm.title}
                                onChange={(e) => setFixForm({ ...fixForm, title: e.target.value })}
                                className="w-full text-xs p-2.5 rounded bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                  Meta Description
                                </label>
                                <span className="text-[11px] font-mono text-neutral-400">
                                  {fixForm.description.length}/160 chars
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                value={fixForm.description}
                                onChange={(e) => setFixForm({ ...fixForm, description: e.target.value })}
                                className="w-full text-xs p-2.5 rounded bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-xl border border-[#22222A] bg-[#121216] space-y-3">
                          <h2 className="text-base font-bold text-white">OpenGraph Preview Image URL</h2>
                          <input
                            type="url"
                            placeholder="https://.../og-image.png"
                            value={fixForm.ogImageUrl}
                            onChange={(e) => setFixForm({ ...fixForm, ogImageUrl: e.target.value })}
                            className="w-full text-xs p-2.5 rounded bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none"
                          />
                        </div>

                        {/* Sticky Bottom Action */}
                        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-[#121216] border-t border-[#22222A] px-6 sm:px-10 py-3.5 flex items-center justify-between z-30 shadow-2xl">
                          <span className="text-xs font-semibold text-white">Metadata configuration ready</span>
                          <button
                            onClick={handleCreatePR}
                            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <GitPullRequest size={14} />
                            <span>Bundle into Pull Request</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 4: PULL REQUESTS ─── */}
                    {route.activeTab === "pull-requests" && (
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-2xl font-bold text-white tracking-tight">Pull Requests</h1>
                          <p className="text-xs text-neutral-400 mt-1">
                            Pull requests for {repoDetails?.repo?.name || activeProject.name}.
                          </p>
                        </div>

                        {createdPRs.length === 0 ? (
                          <div className="p-8 rounded-xl border border-[#22222A] bg-[#121216] text-center space-y-3">
                            <p className="text-xs text-neutral-400">No pull requests created yet.</p>
                            <button
                              onClick={handleCreatePR}
                              className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <GitPullRequest size={13} />
                              <span>Generate First Pull Request</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {createdPRs.map((pr) => (
                              <div
                                key={pr.id}
                                className="p-4 rounded-xl border border-[#22222A] bg-[#121216] flex items-center justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                                      #{pr.number} {pr.status}
                                    </span>
                                    <h3 className="text-sm font-bold text-white">{pr.title}</h3>
                                  </div>
                                  <p className="text-xs text-neutral-400 font-mono">
                                    Branch: {pr.branch} • Created {pr.createdAt}
                                  </p>
                                </div>
                                <span className="text-xs font-mono text-emerald-400">
                                  +{pr.additions}, -{pr.deletions} lines
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── TAB 5: PREVIEWS (FEATURE 3: VISUAL SOCIAL & SEARCH PREVIEWS) ─── */}
                    {route.activeTab === "previews" && (
                      <SocialPreviews
                        key={`${route.repoSlug}-${previewData?.auditId || "none"}`}
                        repoName={repoDetails?.repo?.fullName || activeProject.name}
                        projectSlug={route.repoSlug}
                        token={token}
                        previewData={previewData}
                        isLoadingPreviews={isLoadingPreviews}
                        onNavigateToAudit={() => navigateToHash(`dashboard/${route.repoSlug}/audit`)}
                      />
                    )}

                    {/* ─── TAB 6: MONITORING ─── */}
                    {route.activeTab === "monitoring" && (
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-2xl font-bold text-white tracking-tight">SEO Monitoring</h1>
                          <p className="text-xs text-neutral-400 mt-1">
                            Automate checks for {repoDetails?.repo?.name || activeProject.name}.
                          </p>
                        </div>

                        <div className="p-6 rounded-xl border border-[#22222A] bg-[#121216] space-y-3">
                          <h2 className="text-base font-bold text-white">README Status Badge</h2>
                          <div className="p-3 bg-[#18181D] border border-[#2E2E38] rounded-lg flex items-center justify-between font-mono text-xs">
                            <span className="truncate text-neutral-300">
                              [![MetaMend SEO](https://metamend.dev/badge/{user?.username || "user"}/{activeProject.slug}.svg)](https://metamend.dev)
                            </span>
                            <button
                              onClick={copyMarkdownBadge}
                              className="ml-3 px-3 py-1 bg-white text-black text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isCopiedBadge ? <Check size={12} /> : <Copy size={12} />}
                              <span>{isCopiedBadge ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-6 rounded-xl border border-[#22222A] bg-[#121216] flex items-center justify-between">
                          <div>
                            <h2 className="text-base font-bold text-white">Check every pull request (GitHub Action)</h2>
                            <p className="text-xs text-neutral-400">
                              Automate SEO checks on pull requests before merge.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={actionToggle}
                              onChange={() => setActionToggle(!actionToggle)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 7: SETTINGS ─── */}
                    {route.activeTab === "settings" && (
                      <div className="space-y-6 max-w-2xl">
                        <div>
                          <h1 className="text-2xl font-bold text-white tracking-tight">Project Settings</h1>
                          <p className="text-xs text-neutral-400 mt-1">
                            Configuration for {repoDetails?.repo?.name || activeProject.name}.
                          </p>
                        </div>

                        <div className="p-6 rounded-xl border border-[#22222A] bg-[#121216] space-y-4 text-xs">
                          <div>
                            <label className="block font-medium text-neutral-300 mb-1">Production URL</label>
                            <input
                              type="text"
                              defaultValue={repoDetails?.audit?.liveUrl || activeProject.url}
                              className="w-full p-2.5 rounded bg-[#18181D] border border-[#2E2E38] text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-neutral-300 mb-1">Default Branch</label>
                            <input
                              type="text"
                              defaultValue={repoDetails?.repo?.defaultBranch || activeProject.branch}
                              className="w-full p-2.5 rounded bg-[#18181D] border border-[#2E2E38] text-white font-mono focus:outline-none"
                            />
                          </div>
                          <div className="pt-2">
                            <button
                              onClick={() => alert("Settings updated!")}
                              className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
                            >
                              Save changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* CASE B: ALL PROJECTS MAIN DASHBOARD (Starts empty)        */
            /* ───────────────────────────────────────────────────────── */
            <>
              {/* Subheader */}
              <div className="h-14 border-b border-[#1E1E23] bg-[#0E0E10] px-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4a2 2 0 100-4 2 2 0 000 4zM6 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4zM12 4v6m0 0l-5 5m5-5l5 5" />
                  </svg>
                  <span>{activeNav}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141418] border border-[#26262F] text-xs text-neutral-400">
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-white text-xs placeholder:text-neutral-500 focus:outline-none w-28 lg:w-40"
                      />
                      <kbd className="text-[10px] bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded font-mono">⌘ K</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Body */}
              <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white tracking-tight">Projects</h2>

                  {/* Grid of Projects */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProjects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => navigateToHash(`dashboard/${proj.slug || proj.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`)}
                        className="h-40 rounded-xl border border-[#22222A] bg-[#121216] p-6 flex flex-col justify-between hover:border-neutral-500 hover:bg-[#16161B] transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {proj.name}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1 truncate max-w-xs font-mono">
                              {proj.url}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-neutral-800 text-neutral-300">
                              <span>○</span>
                              <span>Inspect Repo</span>
                            </div>

                            <button
                              onClick={(e) => handleDeleteProject(proj.id, e)}
                              title="Delete project"
                              className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 text-xs transition-opacity cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs text-neutral-400">
                          <span>Created {proj.createdAt}</span>
                          <span className="text-neutral-300 font-medium">Production · Web service</span>
                        </div>
                      </div>
                    ))}

                    {/* + Create new project card */}
                    <div
                      onClick={() => {
                        setShowNewModal(true);
                        if (repos.length === 0 || reposError) {
                          fetchRepos();
                        }
                      }}
                      className="h-40 rounded-xl border border-dashed border-[#262630] hover:border-neutral-500 hover:bg-white/[0.02] flex items-center justify-center p-6 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-400 group-hover:text-white transition-colors">
                        <span className="text-lg leading-none">+</span>
                        <span>Create new project</span>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </>
          )}
        </div>
      </div>

      {/* ─── MODAL: CREATE NEW PROJECT ───────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121216] border border-[#26262F] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-4">
              {/* Always visible GitHub Repository Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-300">
                    Select from your GitHub Repositories
                  </label>
                  <button
                    type="button"
                    onClick={fetchRepos}
                    disabled={isLoadingRepos}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isLoadingRepos ? "animate-spin" : ""} />
                    <span>{isLoadingRepos ? "Loading..." : "Refresh"}</span>
                  </button>
                </div>

                {isLoadingRepos && repos.length === 0 ? (
                  <div className="px-3 py-3 rounded-lg bg-[#18181D] border border-[#2E2E38] flex items-center gap-2.5 text-xs text-neutral-400">
                    <RefreshCw size={14} className="animate-spin text-neutral-400 shrink-0" />
                    <span>Fetching your GitHub repositories...</span>
                  </div>
                ) : repos.length > 0 ? (
                  <div className="space-y-2">
                    {repos.length > 5 && (
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
                        <input
                          type="text"
                          placeholder="Filter repositories..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141418] border border-[#2E2E38] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400"
                        />
                      </div>
                    )}

                    <select
                      value={selectedRepoForNew}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedRepoForNew(val);
                        if (val) {
                          const matched = repos.find(
                            (r) => r.fullName === val || r.name === val
                          );
                          setNewProjectName(matched?.name || val);
                          setNewProjectUrl(matched?.homepage || "");
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white text-xs focus:outline-none focus:border-neutral-400"
                    >
                      <option value="">Choose a repository...</option>
                      {repos
                        .filter((r) =>
                          !repoSearch.trim() ||
                          (r.fullName || r.name)
                            .toLowerCase()
                            .includes(repoSearch.trim().toLowerCase())
                        )
                        .map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.fullName || r.name} ({r.isPrivate ? "Private" : "Public"} · {r.language || "Code"})
                          </option>
                        ))}
                    </select>

                    {requiresGithubReconnect && (
                      <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 text-[11px] text-amber-300">
                        <span>Showing public repos only.</span>
                        <button
                          type="button"
                          onClick={loginWithGithub}
                          className="underline font-semibold hover:text-amber-200 shrink-0 cursor-pointer"
                        >
                          Reconnect GitHub
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[#18181D] border border-[#2E2E38] space-y-2.5 text-xs">
                    <p className="text-neutral-400">
                      {reposError || "No repositories were loaded from your GitHub account."}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchRepos}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium cursor-pointer"
                      >
                        Retry
                      </button>
                      {(requiresGithubReconnect || !token) && (
                        <button
                          type="button"
                          onClick={loginWithGithub}
                          className="px-2.5 py-1 rounded bg-white text-black hover:bg-neutral-200 text-[11px] font-semibold cursor-pointer"
                        >
                          Reconnect GitHub
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. portfolio-site"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Live Website URL (Optional for live crawler)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newProjectUrl}
                  onChange={(e) => setNewProjectUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
                >
                  Create & Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
