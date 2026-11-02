import React, { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";

export const Navbar = () => {
  const { user, isAuthenticated, loginWithGithub, logout, navigateToDashboard, navigateToLanding } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dropdowns = {
    platform: [
      { title: "Design", desc: "Craft layouts with freeform design freedom" },
      { title: "Layout", desc: "Responsive flexbox & grid powered canvases" },
      { title: "CMS", desc: "Manage structured content and dynamic pages" },
      { title: "Localization", desc: "Translate your site for global audiences" },
      { title: "Design Agent", desc: "World-class AI to build and style sections" },
      { title: "Performance", desc: "Ultra-fast hosting and zero config CDN" },
    ],
    solutions: [
      { title: "For Startups", desc: "Launch fast and iterate high-converting pages" },
      { title: "For Agencies", desc: "Deliver production websites in half the time" },
      { title: "For Designers", desc: "Publish directly without waiting for engineers" },
      { title: "For Marketing", desc: "Ship landing pages, A/B test, and scale" },
    ],
    resources: [
      { title: "Templates", desc: "Browse 1,000+ curated designer templates" },
      { title: "Academy", desc: "Free tutorials and video courses" },
      { title: "Community", desc: "Join 150,000+ creators and builders" },
      { title: "What's New", desc: "Latest product releases and changelog" },
    ],
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        isScrolled
          ? "bg-black/85 backdrop-blur-md border-b border-white/[0.08]"
          : "bg-black/60 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between"
        aria-label="Main Navigation"
      >
        {/* Left Side: MetaMend Logo & Navigation Links */}
        <div className="flex items-center gap-8 lg:gap-10">
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateToLanding();
            }}
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
            aria-label="MetaMend Home"
          >
            {/* MetaMend Geometric Symbol: Dual-Chevron / Code Brackets 'M' */}
            <svg
              className="w-[19px] h-[19px] text-white shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5L8.5 4.5L12 12.5L8.5 20.5L3 20.5L6.5 12.5L3 4.5Z"
                fill="currentColor"
              />
              <path
                d="M21 4.5L15.5 4.5L12 12.5L15.5 20.5L21 20.5L17.5 12.5L21 4.5Z"
                fill="currentColor"
              />
            </svg>
            <span className="font-semibold text-[17px] tracking-[-0.02em] text-white">
              MetaMend
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-7">
            {/* Platform Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("platform")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 text-[14px] font-medium text-[#999999] hover:text-white transition-colors py-2 focus:outline-none"
              >
                <span>Platform</span>
                <svg
                  className={`w-3 h-3 text-[#888888] transition-transform duration-200 ${
                    activeDropdown === "platform" ? "rotate-180 text-white" : ""
                  }`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 4.5L6 8L9.5 4.5" />
                </svg>
              </button>

              {activeDropdown === "platform" && (
                <div className="absolute top-full left-0 pt-2 w-72 z-50">
                  <div className="bg-[#0D0D10]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-2.5 shadow-2xl grid gap-1">
                    {dropdowns.platform.map((item) => (
                      <a
                        key={item.title}
                        href="#features"
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors block group"
                      >
                        <div className="text-[13px] font-medium text-white group-hover:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#888888] line-clamp-1">
                          {item.desc}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("solutions")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 text-[14px] font-medium text-[#999999] hover:text-white transition-colors py-2 focus:outline-none"
              >
                <span>Solutions</span>
                <svg
                  className={`w-3 h-3 text-[#888888] transition-transform duration-200 ${
                    activeDropdown === "solutions" ? "rotate-180 text-white" : ""
                  }`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 4.5L6 8L9.5 4.5" />
                </svg>
              </button>

              {activeDropdown === "solutions" && (
                <div className="absolute top-full left-0 pt-2 w-72 z-50">
                  <div className="bg-[#0D0D10]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-2.5 shadow-2xl grid gap-1">
                    {dropdowns.solutions.map((item) => (
                      <a
                        key={item.title}
                        href="#how-it-works"
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors block group"
                      >
                        <div className="text-[13px] font-medium text-white group-hover:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#888888] line-clamp-1">
                          {item.desc}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 text-[14px] font-medium text-[#999999] hover:text-white transition-colors py-2 focus:outline-none"
              >
                <span>Resources</span>
                <svg
                  className={`w-3 h-3 text-[#888888] transition-transform duration-200 ${
                    activeDropdown === "resources" ? "rotate-180 text-white" : ""
                  }`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 4.5L6 8L9.5 4.5" />
                </svg>
              </button>

              {activeDropdown === "resources" && (
                <div className="absolute top-full left-0 pt-2 w-72 z-50">
                  <div className="bg-[#0D0D10]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-2.5 shadow-2xl grid gap-1">
                    {dropdowns.resources.map((item) => (
                      <a
                        key={item.title}
                        href="#faq"
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors block group"
                      >
                        <div className="text-[13px] font-medium text-white group-hover:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#888888] line-clamp-1">
                          {item.desc}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enterprise Link */}
            <a
              href="#developer"
              className="text-[14px] font-medium text-[#999999] hover:text-white transition-colors py-2"
            >
              Enterprise
            </a>

            {/* Pricing Link */}
            <a
              href="#pricing"
              className="text-[14px] font-medium text-[#999999] hover:text-white transition-colors py-2"
            >
              Pricing
            </a>
          </div>
        </div>

        {/* Right Side: Log in & Sign up button / Dashboard pill */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={navigateToDashboard}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer shadow-sm"
              >
                {user?.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-5 h-5 rounded-full border border-white/20"
                  />
                )}
                <span>Dashboard ({user?.username})</span>
              </button>
              <button
                onClick={logout}
                className="text-[13px] font-medium text-[#999999] hover:text-white transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={loginWithGithub}
                className="text-[14px] font-medium text-[#CCCCCC] hover:text-white transition-colors cursor-pointer"
              >
                Log in
              </button>

              <button
                onClick={loginWithGithub}
                className="bg-white text-black font-semibold text-[14px] px-3.5 py-1.5 rounded-full hover:bg-[#E5E5E5] transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
              >
                Sign up
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={navigateToDashboard}
              className="bg-white text-black font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-neutral-200 transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={loginWithGithub}
              className="bg-white text-black font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-neutral-200 transition-colors"
            >
              Sign up
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:text-slate-300 transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 pt-3 pb-6 bg-[#000000]/95 backdrop-blur-2xl border-b border-white/10 space-y-3">
          <div className="space-y-1">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-[15px] font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-[15px] font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Solutions
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-[15px] font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Resources
            </a>
            <a
              href="#developer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-[15px] font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Enterprise
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-[15px] font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Pricing
            </a>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateToDashboard();
                  }}
                  className="w-full text-center py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
                >
                  Go to Dashboard (@{user?.username})
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center py-2 text-sm font-medium text-slate-400 hover:text-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    loginWithGithub();
                  }}
                  className="w-full text-center py-2 text-sm font-medium text-white hover:text-slate-300"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    loginWithGithub();
                  }}
                  className="w-full text-center py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
