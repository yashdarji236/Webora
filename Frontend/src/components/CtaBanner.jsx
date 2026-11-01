import React from "react";

export const CtaBanner = () => {
  return (
    <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 bg-gradient-to-tr from-[#0066FF] via-[#7928CA] to-[#FF0080] shadow-framer-glow text-center text-white">
        {/* Glow overlay */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-white/20 blur-3xl rounded-full"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-block px-3.5 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
            Ready to rank higher?
          </span>

          <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tighter mb-6 leading-tight">
            Find out what Google sees in 30 seconds
          </h2>

          <p className="text-base sm:text-lg text-white/90 mb-8 max-w-xl mx-auto font-normal">
            No credit card. No code changes until you approve the pull request.
            Start fixing your SEO score today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-bold text-sm shadow-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Sign in with GitHub</span>
            </a>

            <a
              href="#live-audit"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-black/30 hover:bg-black/40 border border-white/20 text-white font-bold text-sm transition-all"
            >
              <span>Scan website free</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
