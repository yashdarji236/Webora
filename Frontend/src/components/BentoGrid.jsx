import React, { useState } from "react";
import { ScoreRing } from "./ScoreRing";

export const BentoGrid = () => {
  const [fixIndex, setFixIndex] = useState(0);
  const fixCards = [
    {
      title: "Add missing Open Graph title & image",
      file: "app/layout.tsx",
      impact: "+18 pts",
      type: "Critical",
      snippet: '<meta property="og:image" content="https://mysite.com/og.png" />',
    },
    {
      title: "Add trailingSlash normalization",
      file: "next.config.js",
      impact: "+12 pts",
      type: "Warning",
      snippet: "trailingSlash: true, // prevents duplicate canonicals",
    },
    {
      title: "Block crawler scrapers in robots.txt",
      file: "public/robots.txt",
      impact: "+8 pts",
      type: "Policy",
      snippet: "User-agent: ClaudeBot\nDisallow: /admin/\nAllow: /llms.txt",
    },
  ];

  const currentFix = fixCards[fixIndex % fixCards.length];

  const handleNextFix = () => {
    setFixIndex((prev) => prev + 1);
  };

  const [crawlers, setCrawlers] = useState({
    gptBot: true,
    claudeBot: true,
    perplexity: false,
  });

  const toggleCrawler = (key) => {
    setCrawlers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [copied, setCopied] = useState(false);
  const badgeMarkdown = "[![MetaMend SEO](https://img.shields.io/badge/SEO-91%2F100-10B981)](https://metamend.dev)";

  const handleCopyBadge = () => {
    navigator.clipboard?.writeText(badgeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section id="features" className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
          Feature Bento
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
          Engineered for production repositories
        </h2>
        <p className="text-base text-slate-400">
          Everything you need to audit, inspect, patch, and continuously guard your SEO.
        </p>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Card 1: Live-site audit with ring chart (Large Card - spans 2 cols) */}
        <div className="md:col-span-2 lg:col-span-2 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0066FF]/20 text-[#00F0FF] border border-[#0066FF]/30">
                Live Audit Engine
              </span>
              <span className="text-xs font-mono text-slate-400">48 Automated Checks</span>
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-2">
              Live-site audit with a score out of 100
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Crawls your deployed HTML, tests Open Graph tags, validates canonical headers,
              and verifies redirect loops.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around p-6 rounded-2xl bg-black/50 border border-white/[0.06] gap-6">
            <ScoreRing initialScore={54} targetScore={91} size={150} strokeWidth={10} />
            <div className="space-y-3.5 w-full max-w-[220px]">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Technical Headers</span>
                  <span className="text-[#10B981] font-mono">100%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-full w-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Social Share Cards</span>
                  <span className="text-[#00F0FF] font-mono">95%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00F0FF] h-full w-[95%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Robots & Sitemaps</span>
                  <span className="text-[#F59E0B] font-mono">84%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#F59E0B] h-full w-[84%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Google SERP Preview */}
        <div className="md:col-span-1 lg:col-span-2 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FF0080]/20 text-[#FF0080] border border-[#FF0080]/30">
                SERP Simulator
              </span>
              <span className="text-xs font-mono text-[#F59E0B] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                62/60 chars (Truncation warning)
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              Google result preview
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              Inspect how your meta title and description appear in real desktop and mobile search snippets.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] font-sans">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-[#0066FF]/20 flex items-center justify-center text-[10px] font-bold text-[#0066FF]">
                M
              </div>
              <div className="text-xs text-slate-400">
                metamend.dev <span className="text-slate-600">› docs › seo</span>
              </div>
            </div>
            <div className="text-base font-semibold text-[#8ab4f8] hover:underline cursor-pointer leading-snug mb-1">
              MetaMend — Your SEO score, fixed in one pull request...
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audit your live site, see exactly what Google sees, and let MetaMend commit verified rule-based SEO fixes straight to your GitHub repository.
            </p>
          </div>
        </div>

        {/* Card 3: WhatsApp & Social Share Preview */}
        <div className="md:col-span-1 lg:col-span-2 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                Social Graph
              </span>
              <span className="text-xs font-mono text-slate-400">WhatsApp / X / LinkedIn</span>
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              WhatsApp and social share preview
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              Eliminate broken cards and blank grey squares on LinkedIn, X, and WhatsApp chats.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F1418] border border-white/[0.06]">
            <div className="max-w-[320px] rounded-xl bg-[#1A2229] border border-white/[0.08] p-2.5 space-y-2 shadow-sm">
              <div className="w-full h-24 rounded-lg bg-gradient-to-tr from-[#0066FF] to-[#00F0FF] flex items-center justify-center text-white font-bold text-sm tracking-tight">
                MetaMend • 91/100 Verified
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">
                  MetaMend — Auto-fix SEO via Pull Requests
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  https://metamend.dev
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Swipe to Approve Fixes */}
        <div className="md:col-span-1 lg:col-span-2 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#7928CA]/20 text-[#00F0FF] border border-[#7928CA]/30">
                Fix Stack
              </span>
              <span className="text-xs font-mono font-bold text-[#10B981]">{currentFix.impact}</span>
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              Swipe to approve fixes
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Tinder-style stack of fix cards. Approve what you want committed, skip what you don&apos;t.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">{currentFix.file}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF0080]/20 text-[#FF0080]">
                {currentFix.type}
              </span>
            </div>
            <div className="text-xs font-bold text-white">
              {currentFix.title}
            </div>
            <pre className="p-2.5 rounded-lg bg-[#08080A] text-[#10B981] font-mono text-[11px] overflow-x-auto border border-white/[0.04]">
              <code>{currentFix.snippet}</code>
            </pre>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={handleNextFix}
                className="flex-1 py-1.5 rounded-xl border border-white/10 hover:bg-white/[0.05] text-xs font-semibold text-slate-300 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNextFix}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white framer-btn-primary"
              >
                Approve Fix ✓
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: AI-Crawler Controls (GPTBot, ClaudeBot, PerplexityBot) */}
        <div className="md:col-span-1 lg:col-span-2 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                AI Directives
              </span>
              <span className="text-xs font-mono text-slate-400">llms.txt generator</span>
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              AI-crawler controls & llms.txt
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              Decide whether LLMs can train on your markdown content or summarize your product pages.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { id: "gptBot", name: "GPTBot (OpenAI)", desc: "ChatGPT Search indexer" },
              { id: "claudeBot", name: "ClaudeBot (Anthropic)", desc: "Claude knowledge ingestion" },
              { id: "perplexity", name: "PerplexityBot", desc: "Real-time AI crawler" },
            ].map((bot) => (
              <div
                key={bot.id}
                onClick={() => toggleCrawler(bot.id)}
                className="p-3 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between cursor-pointer hover:border-white/15 transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-white">{bot.name}</div>
                  <div className="text-[11px] text-slate-400">{bot.desc}</div>
                </div>
                <div
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 duration-200 ease-in-out ${
                    crawlers[bot.id] ? "bg-[#0066FF] justify-end" : "bg-white/15 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 6: PR Regression Guard */}
        <div className="md:col-span-1 lg:col-span-1 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                CI Guard
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              PR regression guard
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              GitHub Action blocks PR merges whenever an engineer introduces missing tags.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#EF4444]">
              <span>✖ Check Failed</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              SEO score dropped <span className="line-through text-slate-500">91</span> to <span className="font-bold text-[#EF4444]">78</span>
            </div>
            <div className="text-[10px] text-slate-400">
              PR blocked until fixes are committed.
            </div>
          </div>
        </div>

        {/* Card 7: README Badge */}
        <div className="md:col-span-1 lg:col-span-1 p-8 rounded-3xl framer-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/30">
                Badge
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              README badge
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Showcase your verified score directly in your GitHub repo README.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-center">
              <div className="inline-flex items-center rounded overflow-hidden text-[11px] font-mono font-bold shadow-sm">
                <span className="bg-slate-800 text-white px-2 py-0.5">SEO</span>
                <span className="bg-[#10B981] text-black px-2 py-0.5">91 / 100</span>
              </div>
            </div>

            <button
              onClick={handleCopyBadge}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-[11px] font-semibold transition-colors"
            >
              {copied ? "Copied Markdown! ✓" : "Copy Markdown"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
