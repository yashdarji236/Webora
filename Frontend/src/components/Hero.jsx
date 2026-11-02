import React, { useState } from "react";
import { useAuth } from "../context/useAuth";

/* ─── SVG icons ──────────────────────────────────────────────── */
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

/* ─── Animated sand waves ────────────────────────────────────── */
const WAVE_PATH = "M0 120 Q180 20 360 120 T720 120 T1080 120 T1440 120 V320 H0 Z";

const Waves = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {/* soft sand glow */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(245,235,208,0.35) 0%, transparent 70%)",
      }}
    />

    {/* back wave: slowest, faintest */}
    <svg
      className="wave-layer"
      style={{ height: "55%", opacity: 0.25, animationDuration: "28s" }}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path d={WAVE_PATH} fill="#F5EBD0" />
    </svg>

    {/* middle wave: opposite direction */}
    <svg
      className="wave-layer wave-reverse"
      style={{ height: "42%", opacity: 0.4, animationDuration: "20s" }}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path d={WAVE_PATH} fill="#F5EBD0" />
    </svg>

    {/* front wave: fastest, strongest */}
    <svg
      className="wave-layer"
      style={{ height: "30%", opacity: 0.65, animationDuration: "14s" }}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path d={WAVE_PATH} fill="#F5EBD0" />
    </svg>
  </div>
);

/* ─── Hero ───────────────────────────────────────────────────── */
export const Hero = () => {
  const { user, isAuthenticated, loginWithGithub, navigateToDashboard, authError } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCtaClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigateToDashboard();
    } else {
      setIsRedirecting(true);
      loginWithGithub();
    }
  };

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      <Waves />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* Auth Error Banner if OAuth failed */}
          {authError && (
            <div className="mb-6 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 max-w-lg">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span>Authentication error: {authError}</span>
            </div>
          )}

          {/* H1 */}
          <h1
            className="font-display font-extrabold text-[2.6rem] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] leading-[1.08] tracking-[-0.035em] mb-5"
          >
            <span className="animated-gradient-text">
              Your SEO score,{" "}
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
            <button
              onClick={handleCtaClick}
              disabled={isRedirecting}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-[15px] shadow-lg active:scale-95 transition-all cursor-pointer hover:opacity-95"
              style={{
                background: "linear-gradient(90deg,#7F011F 0%,#A8143A 100%)",
                color: "#F5EBD0",
              }}
            >
              {isRedirecting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Connecting with GitHub...</span>
                </>
              ) : isAuthenticated ? (
                <>
                  <GitHubIcon />
                  <span>Jump into Dashboard (@{user?.username}) →</span>
                </>
              ) : (
                <>
                  <GitHubIcon />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>

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
