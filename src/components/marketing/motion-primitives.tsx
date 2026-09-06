"use client";

/**
 * Primitivas de motion da landing (Fase 7).
 *
 * Regras que valem para todas:
 * - `useReducedMotion` desliga tudo — quem tem "reduzir movimento" ligado no
 *   sistema vê o conteúdo já no estado final, sem transição (spec §36).
 * - Só se anima `transform` e `opacity` (compositor), nunca `width`/`top`.
 * - O conteúdo NUNCA depende do JS para existir: a animação parte de opacidade
 *   baixa mas o texto está no HTML, legível por leitores de ecrã e por
 *   motores de busca.
 */
import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";

/** Curva "editorial": entra depressa, assenta devagar. */
const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "span" | "li" | "section";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      data-reveal
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

/** Revela filhos em cascata — o `delay` de cada um vem do índice. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <Reveal delay={delay + index * stagger}>{child}</Reveal>
      ))}
    </div>
  );
}

/**
 * Título que entra palavra a palavra. Mantém as palavras como texto real
 * (nada de dividir por letras — leitores de ecrã leriam "N-u-v-o-l-y").
 */
export function RevealWords({
  text,
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: (word: string, index: number) => string | undefined;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              className={cn("inline-block", wordClassName?.(word, index))}
              data-reveal
              initial={reduced ? false : { y: "110%" }}
              animate={reduced ? undefined : { y: 0 }}
              transition={{ duration: 0.9, delay: delay + index * 0.055, ease: EASE }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </span>
  );
}

/** Parallax vertical subtil ligado ao scroll (desligado em reduced motion). */
export function useParallax(distance = 60): {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
} {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const smooth = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.4 });
  const still = useTransform(scrollYProgress, () => 0);

  return { ref, y: reduced ? still : smooth };
}

/**
 * Botão "magnético": segue o cursor alguns pixels no hover. É a
 * microinteração de assinatura dos CTAs — some por completo em touch (não há
 * hover) e com movimento reduzido.
 */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  function handleMove(event: React.MouseEvent<HTMLSpanElement>) {
    if (reduced) return;
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    setOffset({
      x: (event.clientX - (bounds.left + bounds.width / 2)) * strength,
      y: (event.clientY - (bounds.top + bounds.height / 2)) * strength,
    });
  }

  return (
    <motion.span
      ref={ref}
      className={cn("inline-block", className)}
      onMouseMove={handleMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={offset}
      transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.5 }}
    >
      {children}
    </motion.span>
  );
}
