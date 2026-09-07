"use client";

/**
 * Primitivas de motion da APP (Fase 7, spec §39).
 *
 * Separadas das da landing (`marketing/motion-primitives.tsx`) de propósito:
 * lá o movimento é editorial e generoso (700ms, curvas longas); aqui é
 * utilitário. Uma inbox é uma ferramenta que se usa dezenas de vezes por
 * dia — animação que se nota à segunda vez já é atrito, não polimento.
 *
 * Regras:
 * - `useReducedMotion` desliga tudo (spec §36). Não é um extra: é a primeira
 *   coisa que cada primitiva verifica.
 * - Só `transform` e `opacity` — nunca `height`/`width`, que forçam layout.
 * - Nada aqui é condição para o conteúdo existir: o estado final é o
 *   normal, a animação é só a chegada a ele.
 */
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Rápida e sem "bounce" — a app não deve parecer um brinquedo. */
const EASE = [0.2, 0, 0, 1] as const;
const DURATION = 0.18;

/**
 * Entrada de um item de lista (email a chegar à inbox, tarefa, evento).
 *
 * `index` produz um escalonamento curto, com teto: sem o teto, o 40.º email
 * de uma lista esperaria quase meio segundo para aparecer, e o utilizador
 * repara mais na espera do que na animação.
 */
const MAX_STAGGER_STEPS = 8;
const STAGGER_STEP = 0.022;

export function ListItemIn({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION,
        ease: EASE,
        delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER_STEP,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Aparecimento de um bloco que acabou de ser calculado — resultado de IA,
 * proposta do agente, cartão de confirmação.
 *
 * Distingue-se do `ListItemIn` por vir de baixo com um pouco mais de curso:
 * é conteúdo novo que o utilizador PEDIU, e vale a pena o olhar seguir até
 * ele.
 */
export function PanelIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Indicador de estado que muda de texto (os passos do agente: "A pesquisar
 * emails ✓" → "A ler a conversa ✓", spec §34).
 *
 * A troca é um crossfade curto em vez de um salto: sem ela, uma sequência
 * rápida de passos lê-se como um piscar, não como progresso.
 */
export function StatusSwap({
  statusKey,
  children,
  className,
}: {
  /** Muda quando o estado muda — é o que dispara a transição. */
  statusKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{children}</span>;

  return (
    <motion.span
      key={statusKey}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}
