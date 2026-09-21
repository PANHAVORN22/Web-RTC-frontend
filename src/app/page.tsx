import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSerenity } from "@/components/landing/hero-serenity";
import { TechStackMarquee } from "@/components/landing/tech-stack-marquee";
import { TextReveal } from "@/components/magicui/text-reveal";
import { BentoGrid } from "@/components/landing/bento-grid";
import { ConnectedPipeline } from "@/components/landing/connected-pipeline";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090a] text-zinc-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Floating Dark Glassmorphism Navbar with Concept 3 Kinetic Logo */}
      <LandingNavbar />

      <main className="flex-1">
        {/* Magic UI Hero with Meteors & Interactive Multi-Tab Workspace Preview */}
        <HeroSerenity />

        {/* Production Stack & Deterministic Guarantees Marquee */}
        <TechStackMarquee />

        {/* Magic UI Scroll-Driven Text Reveal */}
        <TextReveal text="AI Workspace unifies specifications, architectural decisions, and tasks into a single high-integrity graph. Zero hallucinations. Every answer, sourced." />

        {/* Magic UI Bento Grid: Sourced Copilot, Task Extraction, ADRs, pgvector Search */}
        <BentoGrid />

        {/* Connected Knowledge Pipeline: Ingestion -> Core Engine -> Outputs */}
        <ConnectedPipeline />

        {/* Magic UI Radial Glow Bottom CTA Banner */}
        <CtaSection />
      </main>

      {/* Refined Dark Footer with System Health Indicator & Links */}
      <LandingFooter />
    </div>
  );
}
