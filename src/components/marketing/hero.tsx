"use client";

/**
 * Hero — o momento de assinatura da landing.
 *
 * A ideia toda do produto numa imagem: 24 linhas de "ruído" (a inbox como
 * ela chega) a apagarem-se enquanto 3 cartões de "sinal" ganham foco. O
 * visual não é decoração: é literalmente o que o Nuvoly faz, e é por isso
 * que a headline diz "ruído a entrar, sinal a sair".
 */
import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Magnetic } from "@/components/marketing/motion-primitives";
import { VariableHeadline } from "@/components/marketing/variable-headline";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Larguras "aleatórias" fixas — determinístico, para o SSR bater certo. */
const NOISE_ROWS = [
  82, 64, 91, 47, 73, 88, 55, 69, 94, 61, 78, 43, 86, 58, 71, 95, 50, 67, 84, 59, 76, 45, 89, 63,
];

const SIGNAL_CARDS = [
  {
    from: "Sofia Almeida",
    subject: "Bug crítico em produção",
    meta: "Alta · precisa de resposta",
    tone: "high" as const,
  },
  {
    from: "Priya Shah",
    subject: "Feedback do design até sexta",
    meta: "Média · prazo sexta-feira",
    tone: "medium" as const,
  },
  {
    from: "Northwind Cloud",
    subject: "Fatura #4521",
    meta: "Baixa · sem ação",
    tone: "low" as const,
  },
];

export function Hero() {
  return (
    <section className="relative min-h-svh overflow-hidden pt-28 pb-20 md:pt-36">
      {/* Halo frio, muito contido — atmosfera, não "gradiente de startup". */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-primary), transparent 62%)" }}
      />

      <div className="relative mx-auto grid max-w-[104rem] grid-cols-1 items-center gap-16 px-6 md:px-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7 xl:col-span-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="label-technical flex items-center gap-3 text-muted-foreground"
          >
            <span className="inline-block h-px w-8 bg-primary" aria-hidden />
            Copiloto de inbox · PT-PT
          </motion.p>

          {/* Passe o rato por cima: os eixos da fonte abrem debaixo do cursor. */}
          <h1 className="display-poster mt-8 font-display text-[clamp(3.25rem,9.5vw,8.5rem)] leading-[0.84] tracking-[-0.035em] text-foreground">
            <VariableHeadline text="Ruído a entrar." />
            <span className="block text-primary">
              <VariableHeadline text="Sinal a sair." delay={0.18} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
            className="mt-8 max-w-md font-editorial text-lg leading-relaxed text-pretty text-muted-foreground"
          >
            A sua inbox não tem um problema de volume — tem um problema de
            atenção. O Nuvoly lê, resume, prioriza e escreve consigo. Nunca por
            si: nada sai sem a sua confirmação.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.68, ease: EASE }}
            className="mt-11 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link
                href="/login"
                className="label-technical group inline-flex items-center gap-2.5 rounded-full bg-foreground px-7 py-4 text-background transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                Explorar em demo
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Magnetic>

            <a
              href="#produto"
              className="label-technical underline-grow px-2 py-4 text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver o produto a funcionar
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-8 font-editorial text-sm text-muted-foreground"
          >
            Sem cartão, sem ligar conta nenhuma — o modo demo tem uma inbox
            fictícia completa.
          </motion.p>
        </div>

        <div className="lg:col-span-5 xl:col-span-6">
          <NoiseToSignal />
        </div>
      </div>
    </section>
  );
}

function NoiseToSignal() {
  const reduced = useReducedMotion();

  return (
    <div className="relative mx-auto h-[30rem] w-full max-w-lg sm:h-[34rem]">
      {/* Camada de ruído: a inbox como ela chega. */}
      <div aria-hidden className="absolute inset-0 flex flex-col justify-between py-2">
        {NOISE_ROWS.map((width, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3"
            initial={reduced ? false : { opacity: 0.5 }}
            animate={reduced ? undefined : { opacity: 0.1 }}
            transition={{ duration: 1.1, delay: 0.5 + index * 0.022, ease: EASE }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="h-px bg-muted-foreground" style={{ width: `${width}%` }} />
          </motion.div>
        ))}
      </div>

      {/* Camada de sinal: o que sobra depois de a IA analisar. */}
      <div className="absolute inset-y-0 right-0 flex w-full flex-col justify-center gap-3 sm:w-[92%]">
        {SIGNAL_CARDS.map((card, index) => (
          <motion.article
            key={card.subject}
            initial={reduced ? false : { opacity: 0, x: 28, filter: "blur(6px)" }}
            animate={reduced ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 1.1 + index * 0.16, ease: EASE }}
            className={cn(
              "group relative border border-border bg-card/95 p-5 backdrop-blur-sm transition-colors",
              "hover:border-primary/50",
              index === 1 && "sm:-ml-8",
              index === 2 && "sm:ml-6",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-0 bottom-0 left-0 w-px",
                card.tone === "high" && "bg-priority-high",
                card.tone === "medium" && "bg-priority-medium",
                card.tone === "low" && "bg-priority-low",
              )}
            />
            <p className="label-technical text-muted-foreground">{card.from}</p>
            <p className="mt-2 font-editorial text-base leading-snug font-medium text-card-foreground">
              {card.subject}
            </p>
            <p className="mt-2 font-editorial text-xs text-muted-foreground">{card.meta}</p>
          </motion.article>
        ))}

        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.7 }}
          className="label-technical mt-2 text-right text-muted-foreground"
        >
          24 recebidos → 3 que importam
        </motion.p>
      </div>
    </div>
  );
}
