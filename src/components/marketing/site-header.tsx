"use client";

/**
 * Navegação da landing: uma linha fina que se transforma no scroll — no topo
 * é transparente e larga, depois encolhe, ganha fundo e uma hairline. Nunca
 * compete com o conteúdo.
 */
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const links = [
  { href: "#sinal", label: "O problema" },
  { href: "#produto", label: "Produto" },
  { href: "#prova", label: "Prova" },
  { href: "#precos", label: "Preços" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Listener nativo em vez do `useScroll` do framer-motion: aquele depende de
  // `requestAnimationFrame`, que o browser suspende com o separador em
  // segundo plano — e a barra ficava presa no estado inicial ao voltar.
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bloqueia o scroll do fundo enquanto o menu mobile está aberto.
  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[104rem] items-center justify-between px-6 transition-all duration-500 md:px-10",
          scrolled ? "h-14" : "h-20",
        )}
      >
        <Link
          href="/"
          className="group flex items-baseline gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          aria-label="Nuvoly — início"
        >
          <span className="font-display text-2xl leading-none tracking-tight text-foreground">
            Nuvoly
          </span>
          <span
            aria-hidden
            className={cn(
              "hidden h-1.5 w-1.5 rounded-full bg-primary transition-opacity duration-500 sm:block",
              scrolled ? "opacity-100" : "opacity-60",
            )}
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Secções">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="label-technical underline-grow text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="label-technical hidden rounded-full px-4 py-2.5 text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="label-technical group relative hidden overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-background transition-colors hover:bg-primary hover:text-primary-foreground sm:inline-block"
          >
            Ver demo
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-11 items-center justify-center md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            <span className="relative block h-3 w-6">
              <span
                className={cn(
                  "absolute left-0 block h-px w-6 bg-foreground transition-transform duration-300",
                  menuOpen ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-px w-6 bg-foreground transition-transform duration-300",
                  menuOpen ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-border bg-background md:hidden"
        >
          <nav className="flex flex-col px-6 py-4" aria-label="Secções">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-border/60 py-4 font-editorial text-lg text-foreground last:border-0"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/login"
                className="label-technical rounded-full bg-foreground px-5 py-3.5 text-center text-background"
              >
                Ver demo
              </Link>
              <Link
                href="/login"
                className="label-technical rounded-full border border-border px-5 py-3.5 text-center text-muted-foreground"
              >
                Entrar
              </Link>
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
