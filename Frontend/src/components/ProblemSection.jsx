import React from "react";

export const ProblemSection = () => {
  const problems = [
    {
      title: "Accidental noindex",
      explanation:
        "Staging config or a forgotten robots tag deployed to production silently hides your entire website from Google.",
      tag: "Found on live site",
      icon: (
        <svg className="w-5 h-5 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      ),
    },
    {
      title: "Broken sitemap URLs",
      explanation:
        "XML sitemap lists 404 links, stale paths, or redirect URLs that burn through crawl budget before new pages are indexed.",
      tag: "Found on live site",
      icon: (
        <svg className="w-5 h-5 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      title: "Silent redirect chains",
      explanation:
        "HTTP-to-HTTPS hops, trailing-slash ping-pongs, and WWW canonical mismatches that slowly drain ranking equity.",
      tag: "Found on live site",
      icon: (
        <svg className="w-5 h-5 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          Hidden Hazards
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          What your coding agent won&apos;t tell you
        </h2>
        <p className="text-base text-slate-400">
          AI bots generate syntax that looks fine in editor buffers, but they fail at
          actual runtime protocols, server headers, and search crawler logic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {problems.map((prob, idx) => (
          <div
            key={idx}
            className="framer-card p-7 rounded-3xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/25 flex items-center justify-center">
                  {prob.icon}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444] bg-[#EF4444]/10 px-2.5 py-1 rounded-full border border-[#EF4444]/20">
                  {prob.tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                {prob.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {prob.explanation}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs font-semibold text-[#EF4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              <span>Dropped 35+ ranking positions</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
