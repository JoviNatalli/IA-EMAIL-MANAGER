/**
 * Contexto (problema → método). Composição editorial: rótulo fixo à esquerda
 * enquanto a coluna de texto corre, tipografia oversized e réguas finas em
 * vez de cards. Sem ícones decorativos — o número é o elemento gráfico.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const steps = [
  {
    number: "01",
    title: "Ligue a inbox — ou nem isso",
    description:
      "Gmail via OAuth, com sincronização real. Ou entre em modo demo e explore uma inbox fictícia completa sem ligar conta nenhuma.",
  },
  {
    number: "02",
    title: "A IA lê antes de si",
    description:
      "Resumo, categoria, prioridade e intenção de cada conversa — validados por schema, nunca texto livre interpretado à sorte. Se faltar informação, ela diz que falta.",
  },
  {
    number: "03",
    title: "Você decide, sempre",
    description:
      "Enviar, arquivar em massa, criar tarefas: tudo passa por uma confirmação que mostra exatamente quantos itens são afetados antes de acontecer.",
  },
];

export function Workflow() {
  return (
    <section id="sinal" className="relative border-t border-border">
      <div className="mx-auto grid max-w-[104rem] grid-cols-1 gap-12 px-6 py-28 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <p className="label-technical flex items-center gap-3 text-muted-foreground">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              O problema
            </p>

            <Reveal>
              <h2 className="mt-8 max-w-sm font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] tracking-[-0.02em] text-balance text-foreground">
                Ninguém precisa de <em className="text-primary not-italic">mais</em> email.
                Precisa de <em className="text-primary italic">menos</em> decisões.
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-7 max-w-sm font-editorial leading-relaxed text-pretty text-muted-foreground">
                Filtros e regras falham porque exigem que você preveja o futuro.
                O trabalho difícil não é mover mensagens — é perceber, em cada
                manhã, quais é que mudam alguma coisa.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-8 lg:col-start-6">
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <Reveal
                key={step.number}
                delay={index * 0.08}
                as="li"
                className="group grid grid-cols-[auto_1fr] items-start gap-6 border-t border-border py-10 transition-colors hover:border-primary/40 sm:gap-12 sm:py-14"
              >
                <span className="label-technical pt-2 text-muted-foreground transition-colors group-hover:text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-tight tracking-[-0.01em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-xl font-editorial leading-relaxed text-pretty text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
