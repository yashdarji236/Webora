import React from "react";

export const Steps = () => {
  const steps = [
    {
      num: "01",
      title: "Connect GitHub and pick a repo",
      desc: "Authenticate via OAuth in seconds. MetaMend requests only minimal permissions to open branches and pull requests.",
      mockup: (
        <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-white/10">
            <span>github.com/apps/metamend</span>
            <span className="text-[#10B981] font-semibold">Connected</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
            <span className="text-white font-medium">acme/landing-page</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0066FF] text-white">main</span>
          </div>
        </div>
      ),
    },
    {
      num: "02",
      title: "Enter your URL and keywords, then get your score",
      desc: "Our engine executes 48 deterministic checks against your live production server without guesswork.",
      mockup: (
        <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">https://mysite.com</span>
            <span className="text-[#F59E0B] font-bold">54/100</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#F59E0B] h-full w-[54%]" />
          </div>
          <div className="text-[10px] text-slate-400">Found 6 fixes • 0 hallucinations</div>
        </div>
      ),
    },
    {
      num: "03",
      title: "Review the diff and merge the PR",
      desc: "MetaMend opens an automated PR containing verified tags, XML sitemap, and robots.txt. Merge with confidence.",
      mockup: (
        <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#10B981] font-bold">+14 lines added</span>
            <span className="text-[#EF4444] font-bold">-2 lines removed</span>
          </div>
          <div className="p-1.5 rounded bg-white/[0.04] text-[10px] text-[#00F0FF] truncate">
            &lt;meta property=&quot;og:image&quot; content=&quot;/og.png&quot; /&gt;
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[10px]">
            <span className="text-[#10B981]">Checks Passed</span>
            <span className="text-white font-bold">Score 91/100</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          Effortless Workflow
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          How it works
        </h2>
        <p className="text-base text-slate-400">
          From live site audit to merged pull request in under two minutes.
        </p>
      </div>

      <div className="relative">
        {/* Connecting Line (desktop) */}
        <div
          className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-[#0066FF] via-[#7928CA] to-[#00F0FF] -translate-y-24 z-0 opacity-40"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="framer-card p-8 rounded-3xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-2xl font-black text-[#00F0FF]">
                    {st.num}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF]" />
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-3">
                  {st.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  {st.desc}
                </p>
              </div>

              <div className="mt-auto">{st.mockup}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
