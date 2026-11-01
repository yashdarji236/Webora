import React, { useState } from "react";

export const Pricing = () => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Free",
      highlight: "Start at ₹0",
      priceMonthly: "₹0",
      priceAnnual: "₹0",
      period: "forever",
      desc: "Perfect for indie hackers, open-source projects, and personal portfolios.",
      featured: false,
      cta: "Get started for free",
      features: [
        "Public GitHub repositories",
        "Up to 50 pages audited per scan",
        "Automated Pull Request generation",
        "README SEO Score Shield Badge",
        "Social preview debugger",
      ],
    },
    {
      name: "Pro",
      highlight: "Most Popular",
      priceMonthly: "₹1,499",
      priceAnnual: "₹1,199",
      period: "per month",
      desc: "For production SaaS founders and fast-moving software startups.",
      featured: true,
      cta: "Start 14-day free trial",
      features: [
        "Unlimited public & private repos",
        "Unlimited pages & sitemap crawl",
        "Continuous GitHub Action PR Guard",
        "Historical SEO score tracking",
        "AI Crawler & llms.txt auto-sync",
        "Priority GitHub webhook runner",
      ],
    },
    {
      name: "Agency",
      highlight: "For Teams",
      priceMonthly: "₹4,999",
      priceAnnual: "₹3,999",
      period: "per month",
      desc: "For digital agencies and freelancers managing multiple client accounts.",
      featured: false,
      cta: "Contact sales",
      features: [
        "Everything in Pro",
        "White-labeled client PDF reports",
        "Multi-organization GitHub access",
        "Custom rule definitions",
        "Dedicated webhook concurrency",
        "Direct Slack/Discord channel support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          Pricing Plans
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          Fix your SEO today, scale when you grow
        </h2>
        <p className="text-base text-slate-400 mb-8">
          Every plan includes our rule-based auditing engine and pull request generator.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full framer-pill">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !annual
                ? "bg-[#0066FF] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              annual
                ? "bg-[#0066FF] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual billing</span>
            <span className="px-2 py-0.5 rounded-full bg-[#10B981] text-black text-[10px] font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p, idx) => (
          <div
            key={idx}
            className={`relative p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 ${
              p.featured
                ? "framer-card border-2 border-[#0066FF] shadow-framer-glow -translate-y-2"
                : "framer-card"
            }`}
          >
            {p.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full framer-btn-primary text-white text-[11px] font-bold shadow-md">
                {p.highlight}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-xl text-white">
                  {p.name}
                </h3>
                {!p.featured && (
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {p.highlight}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="font-display font-extrabold text-4xl text-white tracking-tight">
                  {annual ? p.priceAnnual : p.priceMonthly}
                </span>
                <span className="text-xs text-slate-400 font-medium">/{p.period}</span>
              </div>

              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {p.desc}
              </p>

              <div className="space-y-3 pt-4 border-t border-white/[0.08]">
                {p.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <svg className="w-4 h-4 text-[#10B981] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <a
                href="https://github.com"
                className={`w-full py-3 rounded-2xl text-xs font-bold text-center block transition-all ${
                  p.featured
                    ? "framer-btn-primary text-white shadow-lg"
                    : "text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                }`}
              >
                {p.cta}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
