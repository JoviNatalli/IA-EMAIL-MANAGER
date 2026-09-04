import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 sm:flex-row sm:justify-between">
        <Logo />
        <p className="text-xs text-muted-foreground">
          Projeto de portfólio — não é um produto comercial ativo.
        </p>
        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Entrar
        </Link>
      </div>
    </footer>
  );
}
