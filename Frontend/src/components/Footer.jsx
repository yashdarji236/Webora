import React from "react";

export const Footer = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-black py-16 text-xs text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-5 h-5 flex items-center justify-center text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 4.5L8.5 4.5L12 12.5L8.5 20.5L3 20.5L6.5 12.5L3 4.5Z"
                    fill="currentColor"
                  />
                  <path
                    d="M21 4.5L15.5 4.5L12 12.5L15.5 20.5L21 20.5L17.5 12.5L21 4.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <span className="font-display font-bold text-base text-white">
                MetaMend
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
              Deterministic, rule-based SEO audit engine & automated GitHub Pull Request generator.
              Audit first, fix second, monitor always.
            </p>

            {/* GitHub Star Button */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-200 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Star on GitHub</span>
              <span className="font-mono text-slate-400 border-l border-white/10 pl-2">
                1.8k
              </span>
            </a>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-xs text-white mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="hover:text-white transition-colors">Live Audit Engine</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">SERP Preview</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Social Share Cards</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">AI Crawler Directives</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">PR Regression Action</a></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-semibold text-xs text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#developer" className="hover:text-white transition-colors">CLI & MCP Docs</a></li>
              <li><a href="https://github.com" className="hover:text-white transition-colors">GitHub Action</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Rules Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Framework Adapters</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-xs text-white mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security Disclosures</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Preferences</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>Made with care for the open web.</div>
          <div>© {new Date().getFullYear()} MetaMend. Open source MIT.</div>
        </div>
      </div>
    </footer>
  );
};
