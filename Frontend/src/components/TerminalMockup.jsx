import React, { useState } from "react";

export const TerminalMockup = ({ targetUrl = "https://mysite.com", interactive = true }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("audit");
  const command = `npx metamend audit ${targetUrl}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="framer-terminal overflow-hidden select-none font-mono text-xs text-slate-300">
      {/* Terminal Title Bar matching exact uploaded image */}
      <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm inline-block" />
          </div>
          <span className="text-[12px] text-slate-400 font-mono pl-1">
            bash — metamend
          </span>
        </div>

        {interactive && (
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-[11px] font-mono transition-all border border-white/[0.08] active:scale-95"
          >
            {copied ? "Copied! ✓" : "Copy command"}
          </button>
        )}
      </div>

      {/* Terminal Body matching exact uploaded screenshot */}
      <div className="p-6 sm:p-7 space-y-3 leading-relaxed text-[13px]">
        {/* Command Line */}
        <div className="flex items-center gap-2.5 font-bold">
          <span className="text-[#FF0080] font-extrabold">$</span>
          <span className="text-white font-mono">{command}</span>
        </div>

        {/* Info Lines */}
        <div className="text-slate-500 pt-1 text-[12px] space-y-1">
          <div>ℹ Fetching live HTML from {targetUrl}... [200 OK]</div>
          <div>ℹ Inspecting 48 SEO rules across headers, tags, & sitemaps...</div>
        </div>

        {/* Diagnostic Results with color tokens */}
        <div className="pt-3 space-y-2 text-[12.5px]">
          <div className="flex items-center justify-between text-[#FF4D4F]">
            <span className="flex items-center gap-2">
              <span className="font-bold">✖ [FAIL]</span>
              <span>og:image meta tag is missing</span>
            </span>
            <span className="font-mono font-semibold text-right shrink-0">-18 pts</span>
          </div>

          <div className="flex items-center justify-between text-[#FFB020]">
            <span className="flex items-center gap-2">
              <span className="font-bold">▲ [WARN]</span>
              <span>robots.txt allows /admin/ crawler access</span>
            </span>
            <span className="font-mono font-semibold text-right shrink-0">-8 pts</span>
          </div>

          <div className="flex items-center justify-between text-[#16C784]">
            <span className="flex items-center gap-2">
              <span className="font-bold">✔ [PASS]</span>
              <span>canonical URL self-references with https://</span>
            </span>
            <span className="font-mono font-semibold text-right shrink-0">+15 pts</span>
          </div>

          <div className="flex items-center justify-between text-[#16C784]">
            <span className="flex items-center gap-2">
              <span className="font-bold">✔ [PASS]</span>
              <span>h1 hierarchy is clean (1 h1 detected)</span>
            </span>
            <span className="font-mono font-semibold text-right shrink-0">+10 pts</span>
          </div>
        </div>

        {/* Bottom Footer Line */}
        <div className="pt-5 mt-2 border-t border-white/[0.08] flex items-center justify-between font-mono font-bold text-[13px]">
          <div className="text-white">
            Current Score: <span className="text-white font-extrabold">64/100</span>
          </div>
          <div className="text-[#0066FF] hover:text-[#00F0FF] transition-colors cursor-pointer">
            PR patch available: <span className="underline decoration-dotted">--fix</span>
          </div>
        </div>
      </div>
    </div>
  );
};

