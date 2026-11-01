import React from "react";

export const SocialProof = () => {
  const frameworks = [
    { name: "Next.js" },
    { name: "Astro" },
    { name: "React" },
    { name: "Vue" },
    { name: "WordPress" },
    { name: "Plain HTML" },
  ];

  return (
    <section className="py-12 border-y border-white/[0.08] bg-black/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-medium text-slate-400">
            Used by developers and freelancers building on
          </p>

          <div className="flex flex-wrap items-center justify-center gap-7 text-slate-400">
            {frameworks.map((fw) => (
              <div
                key={fw.name}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-default"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                <span className="text-xs font-semibold">{fw.name}</span>
              </div>
            ))}
          </div>

          <div className="shrink-0 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full framer-pill shadow-sm">
            <span className="text-xs font-bold font-mono text-slate-300">
              SEO
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-[#10B981] text-black">
              92 / 100
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
