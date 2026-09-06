"use client";

/**
 * Última página — a chamada final e o colofão.
 *
 * O colofão é a nota que as edições cuidadas imprimem no fim: com que tipos
 * foi composta, por quem, e em que condições. Aqui serve também de aviso
 * honesto sobre o que este projeto é — e é o oposto exato de um rodapé de
 * template com cinco colunas de links.
 */
import Link from "next/link";

import { Reveal } from "@/components/marketing/motion-primitives";

const colophon = [
  ["Composição", "Bodoni Moda (manchetes), Newsreader (colunas), Martian Mono (fólios)"],
  ["Interface da app", "Geist — escolhida por legibilidade em listas densas, não por estilo"],
  ["Construção", "Next.js, TypeScript, Drizzle, Auth.js; IA com Gemini e Claude"],
  ["Natureza", "Projeto de portfólio em desenvolvimento — não é um produto comercial ativo"],
  ["Dados desta edição", "Números, citações e preços são exemplos ilustrativos, assinalados como tal"],
];

export function BackPage() {
  return (
    <footer className="relative">
      <section className="border-b border-border">
        <div className="mx-auto max-w-[92rem] px-5 py-20 text-center md:px-8 md:py-28">
          <p className="folio text-muted-foreground">Última página</p>

          <Reveal>
            <h2 className="headline mx-auto mt-6 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-balance text-foreground">
              Devolva a manhã a quem a merece.
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="column-text mx-auto mt-6 max-w-md text-pretty text-muted-foreground">
              Um minuto para abrir o modo demo. Sem cartão, sem ligar conta,
              sem pedir nada em troca.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <Link
              href="/login"
              className="folio mt-10 inline-block border-2 border-foreground bg-foreground px-8 py-4 text-background transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Abrir o modo demo
            </Link>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-[92rem] px-5 py-12 md:px-8">
        <div className="rule-double flex items-baseline justify-between">
          <span className="headline text-3xl leading-none text-foreground md:text-5xl">Nuvoly</span>
          <span className="folio text-muted-foreground">Colofão</span>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {colophon.map(([term, value]) => (
            <div key={term} className="flex gap-4 border-b border-border py-3">
              <dt className="folio w-40 shrink-0 text-muted-foreground">{term}</dt>
              <dd className="column-text text-sm text-pretty text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-6" aria-label="Rodapé">
            {[
              { href: "#caderno-2", label: "Produto" },
              { href: "#assinaturas", label: "Assinaturas" },
              { href: "#correio", label: "Correio" },
              { href: "/login", label: "Entrar" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="folio underline-grow text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="folio text-muted-foreground">© {new Date().getFullYear()} Nuvoly</p>
        </div>
      </div>
    </footer>
  );
}
