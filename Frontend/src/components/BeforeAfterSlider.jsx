import React, { useState } from "react";

export const BeforeAfterSlider = () => {
  const [sliderPos, setSliderPos] = useState(50);

  const fixes = [
    { name: "Automated Open Graph & Twitter Cards", points: "+18 pts", category: "Social" },
    { name: "Trailing-slash canonical normalization", points: "+12 pts", category: "Indexing" },
    { name: "Structured JSON-LD schema generation", points: "+10 pts", category: "Rich Results" },
    { name: "Public robots.txt & llms.txt generation", points: "+7 pts", category: "Crawlers" },
  ];

  return (
    <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          Measurable Transformation
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          Before vs After MetaMend
        </h2>
        <p className="text-base text-slate-400">
          Drag the interactive comparison slider to see how an unindexed codebase transforms
          into an optimized repository in a single pull request.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Interactive Comparison Card */}
        <div className="lg:col-span-7">
          <div className="relative rounded-3xl overflow-hidden framer-card select-none">
            {/* Visual Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Audit Report Comparison</span>
              <div className="flex items-center gap-4">
                <span className="text-[#EF4444] font-bold">54/100 (Before)</span>
                <span className="text-[#10B981] font-bold">91/100 (After)</span>
              </div>
            </div>

            {/* Slider Container */}
            <div className="relative h-96 w-full overflow-hidden">
              {/* After Layer (Background) */}
              <div className="absolute inset-0 p-8 bg-gradient-to-br from-[#10B981]/15 via-black/80 to-black flex flex-col justify-between">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                    AFTER METAMEND (SCORE: 91/100)
                  </span>
                  <h3 className="font-display font-bold text-2xl text-white mt-4">
                    Pristine Google SERP & Clean PR Merged
                  </h3>
                  <p className="text-sm text-slate-300 mt-2 max-w-sm">
                    Verified canonical headers, high-res social image cards, zero 404 links,
                    valid llms.txt directives, and green PR checks.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-black/60 border border-[#10B981]/30 text-xs font-mono text-[#10B981] space-y-1">
                  <div>✓ 0 critical errors</div>
                  <div>✓ 100% crawl budget utilized</div>
                  <div>✓ Rich SERP snippets activated</div>
                </div>
              </div>

              {/* Before Layer (Foreground Clipped) */}
              <div
                className="absolute inset-y-0 left-0 p-8 bg-gradient-to-br from-[#EF4444]/20 via-black/90 to-black border-r-2 border-[#0066FF] flex flex-col justify-between overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="min-w-[320px]">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                    BEFORE (SCORE: 54/100)
                  </span>
                  <h3 className="font-display font-bold text-2xl text-white mt-4">
                    Invisible to Google & Broken Previews
                  </h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-sm">
                    No open graph cards, accidental staging robots header, duplicate www canonicals,
                    and slow sitemap generation.
                  </p>
                </div>
                <div className="min-w-[320px] p-4 rounded-2xl bg-black/60 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] space-y-1">
                  <div>✕ Missing social preview tags</div>
                  <div>✕ Accidental noindex on live site</div>
                  <div>✕ Trailing slash redirect loops</div>
                </div>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="5"
                max="95"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Comparison slider"
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />

              {/* Slider Handle */}
              <div
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full framer-btn-primary text-white flex items-center justify-center shadow-lg"
                style={{ left: `${sliderPos}%` }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </div>

            <div className="p-3 text-center bg-black/40 border-t border-white/[0.06] text-[11px] font-mono text-slate-400">
              Drag horizontally or touch to explore
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-8 rounded-3xl framer-card">
            <h3 className="font-display font-bold text-xl text-white mb-2">
              Verified Point Gains (+37 Total)
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Deterministic rule scores applied directly to code files.
            </p>

            <div className="space-y-3">
              {fixes.map((fix, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.06] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {fix.name}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                      {fix.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#10B981] px-2.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/25">
                    {fix.points}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between font-mono">
              <span className="text-xs text-slate-400">Final Health Score</span>
              <span className="text-sm font-extrabold text-[#10B981]">
                91 / 100
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
