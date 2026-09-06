"use client";

/**
 * Primeira página da edição.
 *
 * Grelha de jornal, não de landing page: manchete a ocupar duas colunas,
 * lede com capitular, e uma coluna estreita à direita com o "fio" — os
 * despachos que chegaram e o que sobrou depois da triagem. A ideia do
 * produto (ruído a entrar, sinal a sair) fica dita pela própria composição:
 * a coluna do fio esvazia-se enquanto três despachos ganham corpo.
 */
import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Larguras fixas — determinístico, para o HTML do servidor bater certo. */
const WIRE_NOISE = [86, 62, 94, 51, 78, 88, 57, 71, 96, 64, 82, 47, 90, 60, 74, 92];

const DISPATCHES = [
  {
    source: "Sofia Almeida",
    headline: "Erro 500 em produção desde as 09h",
    note: "Prioridade alta · pede resposta hoje",
    tone: "high" as const,
  },
  {
    source: "Priya Shah",
    headline: "Revisão do design do Q3 fecha sexta",
    note: "Prioridade média · prazo a 5 dias",
    tone: "medium" as const,
  },
  {
    source: "Northwind Cloud",
    headline: "Fatura #4521 disponível",
    note: "Prioridade baixa · sem ação",
    tone: "low" as const,
  },
];

export function FrontPage() {
  const reduced = useReducedMotion();

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[92rem] px-5 py-10 md:px-8 md:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Corpo principal da capa */}
          <div className="lg:col-span-8 lg:border-r lg:border-border lg:pr-10">
            <p className="folio flex items-center gap-3 text-muted-foreground">
              <span className="inline-block h-px w-10 bg-foreground" aria-hidden />
              Primeira página · Copiloto de inbox
            </p>

            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="headline mt-6 text-[clamp(2.75rem,7.5vw,6.5rem)] text-balance text-foreground"
            >
              A sua manhã não devia começar
              <em className="font-normal italic"> a triar correio</em>.
            </motion.h1>

            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12">
              <p className="column-text drop-cap text-pretty text-foreground md:col-span-7">
                Chegam vinte e quatro conversas por dia a uma caixa de entrada
                normal. Três mudam alguma coisa. O trabalho não é mover
                mensagens de pasta — é descobrir quais são essas três antes de
                o dia começar a decidir por si.
              </p>

              <div className="md:col-span-5 md:border-l md:border-border md:pl-8">
                <p className="column-text text-pretty text-muted-foreground">
                  O Nuvoly lê a caixa antes de si: resume, atribui prioridade,
                  escreve o rascunho. Não envia, não arquiva, não apaga sem uma
                  confirmação sua — e diz quantos itens estão em causa antes de
                  lhe pedir essa confirmação.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="folio border border-foreground bg-foreground px-5 py-3 text-background transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Abrir o modo demo
                  </Link>
                  <a href="#caderno-2" className="folio underline-grow text-foreground">
                    Ver as provas de página ↓
                  </a>
                </div>

                <p className="folio mt-5 text-muted-foreground">
                  Sem cartão · sem ligar conta
                </p>
              </div>
            </div>
          </div>

          {/* Coluna do fio noticioso */}
          <aside className="lg:col-span-4">
            <p className="folio border-b border-foreground pb-2 text-foreground">
              O fio · entrada de hoje
            </p>

            <div className="relative mt-4">
              {/* Ruído: tudo o que chegou */}
              <div aria-hidden className="flex flex-col gap-2.5">
                {WIRE_NOISE.map((width, index) => (
                  <motion.span
                    key={index}
                    className="block h-px bg-foreground"
                    style={{ width: `${width}%` }}
                    initial={reduced ? false : { opacity: 0.42 }}
                    animate={reduced ? undefined : { opacity: 0.1 }}
                    transition={{ duration: 1.2, delay: 0.4 + index * 0.03, ease: EASE }}
                  />
                ))}
              </div>

              {/* Sinal: o que a triagem deixou de pé */}
              <div className="absolute inset-x-0 top-0 flex flex-col gap-3">
                {DISPATCHES.map((item, index) => (
                  <motion.article
                    key={item.headline}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.9 + index * 0.18, ease: EASE }}
                    className="border-t border-foreground bg-background pt-2.5"
                  >
                    <p className="folio flex items-center gap-2 text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          "inline-block size-1.5",
                          item.tone === "high" && "bg-priority-high",
                          item.tone === "medium" && "bg-priority-medium",
                          item.tone === "low" && "bg-priority-low",
                        )}
                      />
                      {item.source}
                    </p>
                    <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-xl leading-tight text-foreground">
                      {item.headline}
                    </h2>
                    <p className="folio mt-1.5 text-muted-foreground">{item.note}</p>
                  </motion.article>
                ))}
              </div>
            </div>

            <p className="folio mt-4 border-t border-border pt-2 text-right text-muted-foreground">
              24 entrados → 3 retidos
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
