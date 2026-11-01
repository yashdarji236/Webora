import React, { useState } from "react";

/* ─── SVG icons ──────────────────────────────────────────────── */
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

/* ─── Hero ───────────────────────────────────────────────────── */
export const Hero = () => {
  const [auditUrl, setAuditUrl] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (!auditUrl) return;
    setIsAuditing(true);
    setTimeout(() => setIsAuditing(false), 1200);
  };

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* soft radial glow — centered */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(109,74,255,0.13) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 60% 80%, rgba(255,77,141,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* H1 */}
          <h1
            className="font-display font-extrabold text-[2.6rem] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] leading-[1.08] tracking-[-0.035em] mb-5 text-[#020617] dark:text-white"
          >
            Your SEO score,{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#6D4AFF 0%,#FF4D8D 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                display: "inline",
              }}
            >
              fixed in one pull&nbsp;request.
            </span>
          </h1>

          {/* subheading */}
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Audit your live site, see exactly what Google sees, and let MetaMend
            commit the fixes straight to your GitHub repo.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
            <a
              href="https://github.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-[15px] shadow-md active:scale-95 transition-transform"
              style={{ background: "linear-gradient(90deg,#6D4AFF 0%,#FF4D8D 100%)" }}
            >
              <GitHubIcon />
              Continue with GitHub
            </a>
            <a
              href="#live-audit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-200 dark:border-white/20 text-slate-800 dark:text-slate-900 font-semibold text-[15px] bg-white hover:bg-slate-50 dark:bg-white dark:hover:bg-slate-100 shadow-sm transition-colors"
            >
              Audit a URL free
            </a>
          </div>

          {/* URL input */}
          <form
            id="live-audit"
            onSubmit={handleAnalyze}
            className="w-full max-w-md flex items-center gap-2 p-1.5 rounded-full bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-white/10 shadow-sm hover:border-violet-300 dark:hover:border-violet-700 focus-within:border-violet-400 dark:focus-within:border-violet-500 transition-colors mb-5"
          >
            <span className="pl-3 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="url"
              required
              placeholder="https://yoursite.com"
              value={auditUrl}
              onChange={(e) => setAuditUrl(e.target.value)}
              className="flex-1 bg-transparent text-sm font-mono text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAuditing}
              className="shrink-0 px-5 py-2 rounded-full text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#6D4AFF 0%,#FF4D8D 100%)" }}
            >
              {isAuditing ? "Scanning…" : "Analyze"}
            </button>
          </form>

          {/* trust line */}
          <p className="flex items-center gap-2 text-[13px] text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16C784]" />
            No credit card · Works with Next.js, Astro, React &amp; plain HTML
          </p>

        </div>
      </div>
    </section>
  );
};
