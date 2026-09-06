/**
 * Preços em composição editorial (linhas, não três cards iguais). Os valores
 * são ilustrativos e a secção diz isso à cabeça — não há cobrança nenhuma
 * neste projeto (spec §8/§13).
 */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/marketing/motion-primitives";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Demo",
    price: "€0",
    period: "para sempre",
    description: "Uma inbox fictícia completa, sem ligar conta nenhuma.",
    features: ["Inbox de demonstração", "Resumos e prioridade", "Copiloto com confirmações"],
    cta: "Entrar no demo",
    featured: false,
  },
  {
    name: "Pro",
    price: "€12",
    period: "por mês",
    description: "Para quem vive na inbox todos os dias.",
    features: [
      "Gmail real via OAuth",
      "Agente com 20 ferramentas",
      "Tarefas, calendário e briefing diário",
      "Escolha do provider de IA",
    ],
    cta: "Experimentar",
    featured: true,
  },
  {
    name: "Equipa",
    price: "€29",
    period: "por utilizador / mês",
    description: "Para equipas que partilham caixas e fluxos.",
    features: ["Tudo do Pro", "Labels e fluxos partilhados", "Controlo de privacidade por equipa"],
    cta: "Falar connosco",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="precos" className="relative border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 py-28 md:px-10 md:py-36">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-technical flex items-center gap-3 text-muted-foreground">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Preços
            </p>
            <Reveal>
              <h2 className="display-poster mt-8 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.94] tracking-[-0.02em] text-foreground">
                Simples, como devia ser.
              </h2>
            </Reveal>
          </div>
          <p className="max-w-sm border-l border-warning/60 pl-4 font-editorial text-sm leading-relaxed text-muted-foreground">
            <span className="label-technical mb-1.5 block text-warning">Valores ilustrativos</span>
            Nada é cobrado: o Nuvoly é um projeto de portfólio e não tem
            pagamentos ativos. Os planos existem para mostrar como a oferta
            seria estruturada.
          </p>
        </div>

        <div className="mt-20 border-t border-border">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.name}
              delay={index * 0.07}
              className={cn(
                "group grid grid-cols-1 items-start gap-6 border-b border-border py-10 transition-colors md:grid-cols-12 md:gap-8 md:py-12",
                plan.featured && "bg-accent/20",
              )}
            >
              <div className="md:col-span-3">
                <h3 className="display-poster font-display text-3xl leading-none text-foreground">
                  {plan.name}
                </h3>
                {plan.featured && (
                  <span className="label-technical mt-3 inline-block text-primary">
                    Mais completo
                  </span>
                )}
              </div>

              <div className="md:col-span-3">
                <p className="flex items-baseline gap-2">
                  <span className="display-poster font-display text-[3.25rem] leading-none tracking-[-0.03em] text-foreground">
                    {plan.price}
                  </span>
                </p>
                <p className="label-technical mt-2 text-muted-foreground">{plan.period}</p>
              </div>

              <div className="md:col-span-4">
                <p className="font-editorial text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 font-editorial text-sm text-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-2 inline-block h-px w-3 shrink-0 bg-primary"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-2 md:text-right">
                <Link
                  href="/login"
                  className="label-technical inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  {plan.cta}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
