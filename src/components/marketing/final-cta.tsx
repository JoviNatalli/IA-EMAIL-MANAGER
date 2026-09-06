"use client";

/**
 * Conversão — fecho da narrativa. Tipografia à escala máxima da página, um
 * único CTA e nada mais a competir com ele.
 */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Magnetic, Reveal, useParallax } from "@/components/marketing/motion-primitives";
import { motion } from "framer-motion";

export function FinalCta() {
  const { ref, y } = useParallax(40);

  return (
    <section ref={ref} className="grain relative overflow-hidden border-t border-border">
      <motion.div
        aria-hidden
        style={{ y }}
        className="pointer-events-none absolute -bottom-1/3 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-[0.09] blur-3xl"
      >
        <div
          className="size-full rounded-full"
          style={{ background: "radial-gradient(circle, var(--color-primary), transparent 60%)" }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-[104rem] px-6 py-32 text-center md:px-10 md:py-44">
        <Reveal>
          <h2 className="display-poster mx-auto max-w-4xl font-display text-[clamp(2.75rem,8vw,7rem)] leading-[0.9] tracking-[-0.03em] text-balance text-foreground">
            Devolva a manhã a quem a merece.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-8 max-w-md font-editorial text-lg text-pretty text-muted-foreground">
            Um minuto para entrar no modo demo. Sem cartão, sem ligar conta,
            sem pedir nada em troca.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-12 flex justify-center">
            <Magnetic strength={0.35}>
              <Link
                href="/login"
                className="label-technical group inline-flex items-center gap-3 rounded-full bg-foreground px-9 py-5 text-background transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                Explorar em demo
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
