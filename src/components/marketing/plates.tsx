"use client";

/**
 * Caderno II — provas de página.
 *
 * Em vez da lista de features, quatro "provas": a mesma superfície do
 * produto fotografada em quatro estados, cada uma com legenda técnica por
 * baixo, como as pranchas de uma revista. Em ecrã grande a prova fica fixa
 * e muda com a leitura; em ecrã pequeno cada prova acompanha o seu texto.
 */
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Reveal } from "@/components/marketing/motion-primitives";
import { ProductSurface, type SurfaceView } from "@/components/marketing/product-preview";
import { cn } from "@/lib/utils";

const plates: {
  view: SurfaceView;
  plate: string;
  title: string;
  body: string;
  caption: string;
}[] = [
  {
    view: "triage",
    plate: "Prova I",
    title: "A caixa chega triada",
    body: "Categoria, prioridade e intenção por conversa, calculadas quando o utilizador pede — nunca em cada abertura, para não gastar chamadas ao modelo sem necessidade.",
    caption: "Lista de inbox com marca de prioridade à esquerda de cada linha.",
  },
  {
    view: "insights",
    plate: "Prova II",
    title: "Resumos que admitem não saber",
    body: "Uma thread longa em três linhas, com os pontos essenciais e a ação sugerida. Quando falta informação, o painel diz que falta em vez de encher o espaço.",
    caption: "Painel de análise: etiquetas, resumo, pontos-chave e sugestão.",
  },
  {
    view: "reply",
    plate: "Prova III",
    title: "Rascunhos no seu tom",
    body: "Tom e comprimento à escolha, instrução em linguagem natural, resultado editável. Fica rascunho: o envio é uma decisão, não um efeito secundário.",
    caption: "Gerador de resposta com controlos de tom e comprimento.",
  },
  {
    view: "confirm",
    plate: "Prova IV",
    title: "O travão do agente",
    body: "O copiloto pesquisa, lê, arquiva, etiqueta e cria tarefas. Antes de qualquer ação sensível mostra o que vai fazer e a quantos itens toca — e espera.",
    caption: "Cartão de confirmação com contagem de itens afetados.",
  },
];

export function Plates() {
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
    <section id="caderno-2" className="scroll-mt-32 border-b border-border">
      <div className="mx-auto max-w-[92rem] px-5 pt-14 md:px-8 md:pt-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Caderno II · Provas de página</p>
          <p className="folio text-muted-foreground">04</p>
        </div>

        <Reveal>
          <h2 className="headline mt-8 max-w-3xl text-[clamp(2rem,4.5vw,3.75rem)] text-balance text-foreground">
            Quatro momentos em que a caixa deixa de pesar.
          </h2>
        </Reveal>
      </div>

      <div className="mx-auto grid max-w-[92rem] grid-cols-1 gap-10 px-5 pt-10 pb-14 md:px-8 md:pb-20 lg:grid-cols-12">
        <div className="hidden lg:col-span-6 lg:block">
          <figure className="sticky top-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={plates[active].view}
                initial={reduced ? false : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <ProductSurface view={plates[active].view} />
              </motion.div>
            </AnimatePresence>
            <figcaption className="folio mt-3 flex items-baseline justify-between border-t border-border pt-2 text-muted-foreground">
              <span>{plates[active].plate}</span>
              <span className="max-w-sm text-right normal-case">{plates[active].caption}</span>
            </figcaption>
          </figure>
        </div>

        <div className="lg:col-span-6">
          {plates.map((plate, index) => (
            <div
              key={plate.view}
              ref={(node) => {
                refs.current[index] = node;
              }}
              className="border-t border-border py-10 first:border-t-0 lg:min-h-[68vh] lg:py-20 lg:first:border-t"
            >
              <p
                className={cn(
                  "folio transition-colors duration-500",
                  index === active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {plate.plate}
              </p>
              <h3 className="mt-4 max-w-lg font-[family-name:var(--font-display)] text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight text-balance text-foreground">
                {plate.title}
              </h3>
              <p className="column-text mt-4 max-w-lg text-pretty text-muted-foreground">
                {plate.body}
              </p>

              <figure className="mt-6 lg:hidden">
                <ProductSurface view={plate.view} />
                <figcaption className="folio mt-2 border-t border-border pt-2 normal-case text-muted-foreground">
                  {plate.caption}
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
