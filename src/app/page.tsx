import { Difference } from "@/components/marketing/difference";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Testimonials } from "@/components/marketing/testimonials";
import { Workflow } from "@/components/marketing/workflow";

/**
 * Landing page (Fase 7 — redesign).
 *
 * A narrativa segue seis momentos: impacto (Hero) → contexto (Workflow) →
 * demonstração (Features) → prova (Testimonials) → diferenciação
 * (Difference) → conversão (Pricing/Faq/FinalCta).
 *
 * `.landing` fixa a paleta escura só para esta página, independentemente do
 * tema escolhido para a app: a landing é a "tinta", o produto é o trabalho.
 * São os mesmos tokens da app, apenas re-escopados (ver globals.css).
 */
export default function LandingPage() {
  return (
    <div className="landing grain relative flex min-h-svh flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Workflow />
        <Features />
        <Testimonials />
        <Difference />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
