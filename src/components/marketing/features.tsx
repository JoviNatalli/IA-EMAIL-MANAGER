"use client";

/**
 * Demonstração (spec §8) — capacidades como experiência, não como lista de
 * cards com ícones. A superfície do produto fica fixa à esquerda e MUDA
 * conforme a capacidade que está a ser lida à direita: o utilizador vê o
 * produto a trabalhar enquanto lê.
 *
 * No mobile a composição é outra (não é a de desktop encolhida): cada
 * capacidade traz a sua própria superfície, empilhada.
 */
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Reveal } from "@/components/marketing/motion-primitives";
import { ProductSurface, type SurfaceView } from "@/components/marketing/product-preview";
import { cn } from "@/lib/utils";

const capabilities: {
  view: SurfaceView;
  index: string;
  title: string;
  description: string;
}[] = [
  {
    view: "triage",
    index: "I",
    title: "A inbox chega já triada",
    description:
      "Categoria, prioridade e intenção por conversa. A prioridade aparece como Alta, Média ou Baixa — a fórmula por trás nunca é exposta, porque um número inventado não ajudaria ninguém a decidir.",
  },
  {
    view: "insights",
    index: "II",
    title: "Resumos que admitem não saber",
    description:
      "Uma thread de doze mensagens em três linhas, com os pontos que interessam e a ação sugerida. Se o email não tiver informação suficiente, o painel diz isso em vez de preencher o espaço com suposições.",
  },
  {
    view: "reply",
    index: "III",
    title: "Rascunhos com o seu tom",
    description:
      "Escolhe o tom e o comprimento, dá uma instrução em linguagem natural e recebe um rascunho editável. Fica sempre rascunho: o envio é uma decisão sua, não um efeito secundário.",
  },
  {
    view: "confirm",
    index: "IV",
    title: "Um agente com travões",
    description:
      "Peça em português e o copiloto pesquisa, lê, arquiva, etiqueta e cria tarefas. Antes de qualquer ação sensível, mostra o que vai fazer e a quantos itens toca — e espera.",
  },
];

export function Features() {
  const [active, setActive] = React.useState(0);
  const reduced = useReducedMotion();
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = refs.current.findIndex((node) => node === entry.target);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const node of refs.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="produto" className="relative border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 pt-28 md:px-10 md:pt-36">
        <p className="label-technical flex items-center gap-3 text-muted-foreground">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          O produto
        </p>
        <Reveal>
          <h2 className="mt-8 max-w-3xl font-display text-[clamp(2.25rem,5.5vw,5rem)] leading-[0.94] tracking-[-0.02em] text-balance text-foreground">
            Quatro momentos em que a inbox deixa de pesar.
          </h2>
        </Reveal>
      </div>

      <div className="mx-auto grid max-w-[104rem] grid-cols-1 gap-12 px-6 pt-16 pb-28 md:px-10 md:pb-36 lg:grid-cols-12 lg:gap-10">
        {/* Superfície fixa — só desktop. */}
        <div className="hidden lg:col-span-6 lg:block">
          <div className="sticky top-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={capabilities[active].view}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductSurface view={capabilities[active].view} />
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-2" aria-hidden>
              {capabilities.map((capability, index) => (
                <span
                  key={capability.view}
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    index === active ? "bg-primary" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          {capabilities.map((capability, index) => (
            <div
              key={capability.view}
              ref={(node) => {
                refs.current[index] = node;
              }}
              className="border-t border-border py-12 first:border-t-0 lg:min-h-[70vh] lg:py-24 lg:first:border-t"
            >
              <p
                className={cn(
                  "label-technical transition-colors duration-500",
                  index === active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {capability.index}
              </p>
              <h3 className="mt-5 max-w-lg font-display text-[clamp(1.75rem,3.2vw,3rem)] leading-[1.02] tracking-[-0.015em] text-balance text-foreground">
                {capability.title}
              </h3>
              <p className="mt-5 max-w-lg font-editorial leading-relaxed text-pretty text-muted-foreground">
                {capability.description}
              </p>

              {/* Mobile: a superfície acompanha cada capacidade. */}
              <div className="mt-8 lg:hidden">
                <ProductSurface view={capability.view} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
