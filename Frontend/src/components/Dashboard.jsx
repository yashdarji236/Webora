import React, { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { Navbar } from "./Navbar";

export const Dashboard = () => {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("metamend_created_projects") || "[]");
    } catch {
      return [];
    }
  });
  const [repos, setRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Projects");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // Form states for creating a project
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");
  const [selectedRepoForNew, setSelectedRepoForNew] = useState("");

  // Fetch repositories from GitHub in case the user wants to pick one in the modal
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch("/api/user/repos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.repos)) {
            setRepos(data.repos);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user repos:", err.message);
      }
    };

    if (token) {
      fetchRepos();
    }
  }, [token]);

  const handleCreateNewProject = (e) => {
    e.preventDefault();
    const name = newProjectName.trim() || selectedRepoForNew || "My project";
    const url = newProjectUrl.trim() || (selectedRepoForNew ? `github.com/${user?.username || "user"}/${selectedRepoForNew}` : "https://metamend.dev");

    const newProj = {
      id: Date.now(),
      name,
      url,
      createdAt: new Date().toLocaleDateString(),
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

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#E0E0E0] flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      {/* ─── 1. PREVIOUS NAVBAR AT TOP ─────────────────────────────────── */}
      <Navbar />

      {/* ─── 2. ONRENDER WORKSPACE LAYOUT (Below fixed navbar) ─────────── */}
      <div className="flex-1 flex pt-16 min-h-[calc(100vh-4rem)]">
        {/* LEFT SIDEBAR (OnRender style) */}
        <aside
          className={`bg-[#0B0B0D] border-r border-[#1E1E23] flex flex-col justify-between shrink-0 transition-all duration-200 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar z-20 ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Top: Workspace Selector & Navigation */}
          <div>
            <div className="h-14 px-4 flex items-center border-b border-[#1E1E23]">
              <div className="flex items-center gap-2.5 w-full">
                <svg
                  className="w-5 h-5 text-white shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 3.84 2.16 7.18 5.34 8.87-.04-.55-.04-1.23.08-1.76.13-.58.91-3.86.91-3.86s-.23-.46-.23-1.15c0-1.08.63-1.89 1.41-1.89.66 0 .98.5 0.98 1.1 0 .67-.43 1.67-.65 2.6-.18.78.39 1.41 1.16 1.41 1.39 0 2.46-1.46 2.46-3.57 0-1.87-1.34-3.17-3.26-3.17-2.38 0-3.78 1.79-3.78 3.63 0 .72.28 1.49.62 1.91.07.08.08.16.06.24-.07.28-.21.87-.24 1-.04.16-.13.2-.3.12-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.41 5.91-5.41 3.1 0 5.51 2.21 5.51 5.16 0 3.08-1.94 5.56-4.63 5.56-.91 0-1.76-.47-2.05-1.03l-.56 2.13c-.2 0.78-.75 1.76-1.12 2.36 1.05.32 2.17.5 3.33.5 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>

                {!isSidebarCollapsed && (
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                      className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-neutral-700 text-white flex items-center justify-center text-[10px] font-bold">
                          {user?.username ? user.username.charAt(0).toUpperCase() : "M"}
                        </span>
                        <span className="truncate">My Workspace</span>
                      </div>
                      <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </button>

                    {showWorkspaceDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-52 bg-[#121216] border border-[#26262F] rounded-lg shadow-2xl p-2 z-50 text-xs">
                        <div className="px-2 py-1.5 text-neutral-400 font-medium border-b border-white/5">
                          Workspaces
                        </div>
                        <button
                          onClick={() => setShowWorkspaceDropdown(false)}
                          className="w-full text-left px-2 py-1.5 rounded text-white hover:bg-white/[0.08] flex items-center gap-2 mt-1 cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-full bg-neutral-600 text-white flex items-center justify-center text-[9px] font-bold">
                            {user?.username ? user.username.charAt(0).toUpperCase() : "M"}
                          </span>
                          <span>My Workspace</span>
                          <span className="ml-auto text-[10px] text-neutral-400">Personal</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-3 space-y-6">
              <div className="space-y-1">
                {/* Projects */}
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

                {/* Blueprints */}
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

                {/* Environment Groups */}
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

              {/* INTEGRATIONS Section */}
              {!isSidebarCollapsed && (
                <div className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Integrations
                  </div>
                  <button
                    onClick={() => setActiveNav("Observability")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeNav === "Observability" ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Observability</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("Webhooks")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeNav === "Webhooks" ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Webhooks</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("Notifications")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeNav === "Notifications" ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Notifications</span>
                  </button>
                </div>
              )}

              {/* NETWORKING Section */}
              {!isSidebarCollapsed && (
                <div className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Networking
                  </div>
                  <button
                    onClick={() => setActiveNav("Private Links")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeNav === "Private Links" ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Private Links</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("Dedicated IPs")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeNav === "Dedicated IPs" ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                    <span>Dedicated IPs</span>
                  </button>
                </div>
              )}
            </nav>
          </div>

          {/* Bottom Section: Changelog, Status, Collapse */}
          <div className="p-3 border-t border-[#1E1E23] space-y-1">
            <a
              href="#changelog"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              title="Changelog"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {!isSidebarCollapsed && <span>Changelog</span>}
            </a>

            <a
              href="#status"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              title="Status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-1" />
              {!isSidebarCollapsed && <span className="ml-1">Status</span>}
            </a>

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
        </aside>

        {/* ─── MAIN CONTENT AREA ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sub-header row matching OnRender: Search, + New, Upgrade */}
          <div className="h-14 border-b border-[#1E1E23] bg-[#0E0E10] px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4a2 2 0 100-4 2 2 0 000 4zM6 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4zM12 4v6m0 0l-5 5m5-5l5 5" />
              </svg>
              <span>{activeNav}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Search ⌘ K */}
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

              {/* + New Button */}
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#18181D] hover:bg-[#222228] border border-[#2E2E38] text-white transition-all active:scale-95 cursor-pointer"
              >
                <span>+ New</span>
              </button>

              {/* Upgrade Button */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors border border-transparent cursor-pointer">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Upgrade</span>
              </button>
            </div>
          </div>

          {/* Main Content Body */}
          <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
            {/* Header Row: Overview + Invite your team */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>

              <button className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer">
                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>+ Invite your team</span>
              </button>
            </div>

            {/* Section: Projects */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Projects</h2>

              {/* Grid of Projects (Exact layout of OnRender) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User-created projects (starts empty, only shown when created) */}
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="h-40 rounded-xl border border-[#22222A] bg-[#121216] p-6 flex flex-col justify-between hover:border-neutral-600 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{proj.name}</h3>
                        <p className="text-xs text-neutral-500 mt-1 truncate max-w-xs">
                          {proj.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status badge: 'Needs attention' matching the exact red badge from reference */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#991B1B] text-white text-xs font-semibold">
                          <span>✕</span>
                          <span>Needs attention</span>
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

                {/* + Create new project card (Dashed border matching reference screenshot) */}
                <div
                  onClick={() => setShowNewModal(true)}
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
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400"
                  autoFocus
                />
              </div>

              {repos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Connect GitHub Repository (Optional)
                  </label>
                  <select
                    value={selectedRepoForNew}
                    onChange={(e) => {
                      setSelectedRepoForNew(e.target.value);
                      if (!newProjectName && e.target.value) {
                        setNewProjectName(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181D] border border-[#2E2E38] text-white text-xs focus:outline-none focus:border-neutral-400"
                  >
                    <option value="">Choose a repository...</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.fullName || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Live Website URL (Optional)
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
