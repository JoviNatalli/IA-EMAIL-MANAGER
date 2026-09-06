"use client";

/**
 * Título tipográfico vivo — a assinatura da página.
 *
 * Cada palavra é uma instância independente da Bricolage Grotesque e os eixos
 * variáveis (`wdth` 75–100, `wght` 400–800, `opsz`) respondem à distância do
 * cursor: a tipografia "abre" onde o rato está e volta a condensar quando ele
 * se afasta. Não é um efeito por cima do texto — é o próprio texto a mudar de
 * desenho, coisa que só uma fonte variável permite.
 *
 * Notas de implementação que interessam:
 * - Nada disto passa por estado do React. O `mousemove` escreve direto no
 *   `style` de cada palavra dentro de um `requestAnimationFrame`; um
 *   re-render por frame com dezenas de palavras seria insuportável.
 * - As palavras continuam a ser texto real (nunca partido letra a letra):
 *   um leitor de ecrã lê "Ruído", não "R-u-í-d-o".
 * - Com `prefers-reduced-motion` o efeito não é ligado de todo e o título
 *   fica no seu estado final.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

/** Estado de repouso: no extremo condensado do eixo, pesado como um cartaz. */
const REST = { wdth: 75, wght: 760 };
/** Estado sob o cursor: no extremo aberto, mais leve. */
const HOVER = { wdth: 100, wght: 460 };
/** Raio de influência do cursor, em pixels. */
const RADIUS = 400;
/**
 * Expoente da queda de influência. Com 2 o efeito quase não se via fora do
 * ponto exato do cursor; 1.4 mantém o foco mas deixa as palavras vizinhas
 * acompanhar — que é o que faz a linha inteira parecer viva.
 */
const FALLOFF = 1.4;

function settings(wdth: number, wght: number, opsz: number) {
  return `"wdth" ${wdth.toFixed(1)}, "wght" ${wght.toFixed(0)}, "opsz" ${opsz}`;
}

export function VariableHeadline({
  text,
  className,
  wordClassName,
  opsz = 96,
  delay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  opsz?: number;
  delay?: number;
}) {
  const wordsRef = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [reduced, setReduced] = React.useState(true);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    // Sem cursor (telemóvel/tablet) não há efeito nenhum a montar.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    // Estado atual por palavra, para interpolar em vez de saltar.
    const current = wordsRef.current.map(() => ({ ...REST }));

    function tick() {
      frame = requestAnimationFrame(tick);
      wordsRef.current.forEach((node, index) => {
        if (!node) return;
        const box = node.getBoundingClientRect();
        const target = { ...REST };

        if (pointer) {
          const dx = pointer.x - (box.left + box.width / 2);
          const dy = pointer.y - (box.top + box.height / 2);
          const distance = Math.hypot(dx, dy);
          // Queda suave: 1 debaixo do cursor, 0 no limite do raio.
          const influence = Math.max(0, 1 - distance / RADIUS) ** FALLOFF;
          target.wdth = REST.wdth + (HOVER.wdth - REST.wdth) * influence;
          target.wght = REST.wght + (HOVER.wght - REST.wght) * influence;
        }

        const state = current[index];
        state.wdth += (target.wdth - state.wdth) * 0.12;
        state.wght += (target.wght - state.wght) * 0.12;
        node.style.fontVariationSettings = settings(state.wdth, state.wght, opsz);
      });
    }

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointer = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, opsz]);

  const words = text.split(" ");

  return (
    <span className={cn("inline", className)}>
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden align-bottom">
            <span
              ref={(node) => {
                wordsRef.current[index] = node;
              }}
              className={cn("inline-block", !reduced && "animate-word-in", wordClassName)}
              style={{
                fontVariationSettings: settings(REST.wdth, REST.wght, opsz),
                animationDelay: reduced ? undefined : `${delay + index * 0.06}s`,
              }}
            >
              {word}
            </span>
          </span>
          {index < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </span>
  );
}
