import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { SocialProof } from "./components/SocialProof";
import { ProblemSection } from "./components/ProblemSection";
import { Steps } from "./components/Steps";
import { BentoGrid } from "./components/BentoGrid";
import { BeforeAfterSlider } from "./components/BeforeAfterSlider";
import { DeveloperSection } from "./components/DeveloperSection";
import { Pricing } from "./components/Pricing";
import { Faq } from "./components/Faq";
import { CtaBanner } from "./components/CtaBanner";
import { Footer } from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col selection:bg-[#0066FF]/30 selection:text-white">
      {/* 1. NAVBAR */}
      <Navbar />

      <main className="flex-1">
        {/* 2. HERO */}
        <Hero />

        {/* 3. SOCIAL PROOF STRIP */}
        <SocialProof />

        {/* 4. PROBLEM SECTION */}
        <ProblemSection />

        {/* 5. HOW IT WORKS */}
        <Steps />

        {/* 6. FEATURE BENTO GRID */}
        <BentoGrid />

        {/* 7. BEFORE / AFTER SECTION */}
        <BeforeAfterSlider />

        {/* 8. DEVELOPER SECTION */}
        <div id="developer">
          <DeveloperSection />
        </div>

        {/* 9. PRICING */}
        <Pricing />

        {/* 10. FAQ */}
        <Faq />

        {/* 11. FINAL CTA BANNER */}
        <CtaBanner />
      </main>

      {/* 12. FOOTER */}
      <Footer />
    </div>
  );
}

export default App;
