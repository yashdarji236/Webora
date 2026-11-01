import React, { useState } from "react";

export const Faq = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "Do I need AI or an API key?",
      a: "No. MetaMend is 100% deterministic and rule-based. There are zero LLM API calls, no token bills, no hallucinated meta tags, and no API keys required.",
    },
    {
      q: "Will it change my main branch directly?",
      a: "Never. MetaMend creates an isolated branch (e.g., `metamend/fix-seo-meta-tags`) and opens a standard GitHub Pull Request. You review the exact diff, verify the commit, and merge it only when you're completely satisfied.",
    },
    {
      q: "Which frameworks are supported?",
      a: "We support Next.js (both App Router & Pages Router), Astro, React (Vite / CRA), Vue, SvelteKit, WordPress, and static HTML. Our engine detects your repo structure automatically.",
    },
    {
      q: "Is my code stored?",
      a: "No. MetaMend analyzes files in-memory during audit and patch generation. We never save, clone, or index your private source code on permanent storage disks.",
    },
    {
      q: "Is this different from asking Claude Code to add SEO?",
      a: "Yes. General AI coding agents write code based on syntax probabilities without knowing how your live CDN, HTTP headers, robots directives, or sitemaps actually respond. MetaMend tests your live production site, finds real-world runtime discrepancies, and applies verified patches.",
    },
  ];

  return (
    <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center mb-16">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          FAQ
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          Frequently asked questions
        </h2>
        <p className="text-base text-slate-400">
          Everything you need to know about our auditor and GitHub integration.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl framer-card overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                aria-expanded={isOpen}
                className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              >
                <span className="font-display font-bold text-base sm:text-lg text-white">
                  {faq.q}
                </span>
                <span
                  className={`shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 transition-transform duration-200 ${
                    isOpen ? "rotate-180 bg-[#0066FF] text-white" : ""
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06]">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
