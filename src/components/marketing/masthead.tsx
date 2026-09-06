"use client";

/**
 * Cabeçalho da edição (substitui a navbar de SaaS).
 *
 * No topo é o cabeçalho de um jornal: wordmark à largura toda entre filetes
 * duplos, com a linha de dados da edição. Ao descer, colapsa numa "cabeça
 * corrente" — a linha fina que os jornais imprimem no topo das páginas
 * interiores, com o nome da publicação, a secção onde se está e o índice.
 *
 * A data da edição vem do servidor (prop) em vez de ser calculada aqui: é o
 * que evita um estado extra e qualquer divergência de hidratação.
 */
import * as React from "react";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const sections = [
  { id: "caderno-1", folio: "02", label: "O problema" },
  { id: "caderno-2", folio: "04", label: "O produto" },
  { id: "caderno-3", folio: "07", label: "Verificação" },
  { id: "editorial", folio: "09", label: "Editorial" },
  { id: "assinaturas", folio: "11", label: "Assinaturas" },
  { id: "correio", folio: "13", label: "Correio" },
];

export function Masthead({ editionDate }: { editionDate: string }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [current, setCurrent] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 220);
    // Fora do corpo do efeito: além de ser o que a regra do React pede, evita
    // um render extra quando a página abre no topo (o caso normal).
    const initial = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Cabeça corrente: mostra a secção que está a ser lida.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const section of sections) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const currentLabel = sections.find((section) => section.id === current)?.label;

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto max-w-[92rem] px-5 md:px-8">
        {/* Linha de dados da edição */}
        <div
          className={cn(
            "folio flex items-center justify-between overflow-hidden text-muted-foreground transition-all duration-500",
            collapsed ? "h-0 opacity-0" : "h-8 pt-2.5 opacity-100",
          )}
        >
          <span>Edição n.º 1 · {editionDate}</span>
          <span className="hidden sm:block">Lisboa · Português de Portugal</span>
          <span>Preço: gratuito</span>
        </div>

        {/* Cabeçalho: expandido no topo, cabeça corrente depois */}
        <div className="rule-double flex items-baseline justify-between gap-4">
          <Link href="/" aria-label="Nuvoly — início" className="block">
            <Logo
              variant="edition"
              className="transition-all duration-500"
              style={{ fontSize: collapsed ? "1.35rem" : "clamp(2.5rem, 7vw, 5.5rem)" }}
            />
          </Link>

          {collapsed && currentLabel && (
            <span className="folio hidden text-muted-foreground md:block">{currentLabel}</span>
          )}

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/login"
              className="folio underline-grow hidden text-foreground sm:inline-block"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="folio border border-foreground bg-foreground px-4 py-2 text-background transition-colors hover:bg-background hover:text-foreground"
            >
              Ler a edição
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="folio underline-grow text-foreground md:hidden"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "Fechar" : "Índice"}
            </button>
          </div>
        </div>

        {/* Índice: sempre visível em desktop quando colapsado */}
        <nav
          className={cn(
            "hidden items-center justify-between border-b border-border py-2 md:flex",
            collapsed ? "flex" : "hidden",
          )}
          aria-label="Índice da edição"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "folio underline-grow transition-colors",
                current === section.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="mr-2 opacity-60">{section.folio}</span>
              {section.label}
            </a>
          ))}
        </nav>

        {menuOpen && (
          <nav className="border-b border-border py-2 md:hidden" aria-label="Índice da edição">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-baseline justify-between border-b border-border/60 py-3 last:border-0"
              >
                <span className="column-text text-foreground">{section.label}</span>
                <span className="folio text-muted-foreground">{section.folio}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
