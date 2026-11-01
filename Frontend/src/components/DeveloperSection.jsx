import React from "react";
import { TerminalMockup } from "./TerminalMockup";

export const DeveloperSection = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-5">
          <span className="text-xs font-semibold text-[#0066FF] uppercase tracking-wider block mb-2">
            Developer CLI & MCP
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter text-white mb-4">
            Auditing designed for your terminal & agent tools
          </h2>
          <p className="text-base text-slate-400 mb-6 leading-relaxed">
            Run instant audits without leaving your workflow. MetaMend ships with an
            official Model Context Protocol (MCP) server and CLI tool so Claude Code, Cursor,
            or CI scripts can invoke our rule-based engine directly.
          </p>

          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span>Official Model Context Protocol (MCP) provider included</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span>CI/CD exit codes (exit 1 on score drop)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span>Zero telemetry, runs local deterministic checks</span>
            </div>
          </div>
        </div>

        {/* Right Column: Terminal Mockup matching user image */}
        <div className="lg:col-span-7">
          <TerminalMockup targetUrl="https://mysite.com" interactive={true} />
        </div>
      </div>
    </section>
  );
};
