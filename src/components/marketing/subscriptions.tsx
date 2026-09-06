/**
 * Assinaturas — os preços na forma em que um jornal os publica: uma tabela
 * de assinatura com filetes, não três cartões iguais com um "mais popular"
 * a piscar. Valores ilustrativos, e a secção diz isso à cabeça.
 */
import Link from "next/link";

import { Reveal } from "@/components/marketing/motion-primitives";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Avulso",
    price: "€0",
    period: "para sempre",
    line: "A edição de demonstração, aberta a toda a gente.",
    includes: ["Caixa fictícia completa", "Resumos e prioridade", "Copiloto com confirmações"],
    cta: "Abrir demo",
    featured: false,
  },
  {
    name: "Assinatura",
    price: "€12",
    period: "por mês",
    line: "Para quem vive na caixa de entrada todos os dias.",
    includes: [
      "Gmail real via OAuth",
      "Agente com 20 ferramentas",
      "Tarefas, calendário e resumo diário",
      "Escolha do provider de IA",
    ],
    cta: "Assinar",
    featured: true,
  },
  {
    name: "Redação",
    price: "€29",
    period: "por pessoa / mês",
    line: "Para equipas que partilham caixas e fluxos.",
    includes: ["Tudo da assinatura", "Etiquetas e fluxos partilhados", "Privacidade por equipa"],
    cta: "Falar connosco",
    featured: false,
  },
];

export function Subscriptions() {
  return (
    <section id="assinaturas" className="scroll-mt-32 border-b border-border">
      <div className="mx-auto max-w-[92rem] px-5 py-14 md:px-8 md:py-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Assinaturas</p>
          <p className="folio text-muted-foreground">11</p>
        </div>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <h2 className="headline max-w-2xl text-[clamp(2rem,4.5vw,3.75rem)] text-balance text-foreground">
              Tabela de assinaturas.
            </h2>
          </Reveal>
          <p className="column-text max-w-sm border-l-2 border-warning pl-4 text-sm text-muted-foreground">
            <span className="folio mb-1 block text-warning">Valores ilustrativos</span>
            Nada é cobrado. Este é um projeto de portfólio sem pagamentos
            ativos; a tabela existe para mostrar como a oferta seria
            estruturada.
          </p>
        </div>

        <div className="mt-12 border-t-2 border-foreground">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.name}
              delay={index * 0.06}
              className={cn(
                "grid grid-cols-1 items-baseline gap-5 border-b border-border py-8 md:grid-cols-12 md:gap-8",
                plan.featured && "bg-accent/25",
              )}
            >
              <div className="md:col-span-3">
                <h3 className="font-[family-name:var(--font-display)] text-3xl leading-none text-foreground">
                  {plan.name}
                </h3>
                <p className="column-text mt-2 text-sm text-muted-foreground">{plan.line}</p>
              </div>

              <div className="md:col-span-3">
                <p className="font-[family-name:var(--font-display)] text-[3.5rem] leading-none text-foreground">
                  {plan.price}
                </p>
                <p className="folio mt-1 text-muted-foreground">{plan.period}</p>
              </div>

              <ul className="md:col-span-4">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="column-text flex items-baseline gap-3 border-b border-border/60 py-1.5 text-sm text-foreground last:border-0"
                  >
                    <span aria-hidden className="inline-block h-px w-3 shrink-0 bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="md:col-span-2 md:text-right">
                <Link
                  href="/login"
                  className="folio inline-block border border-foreground px-5 py-3 text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
