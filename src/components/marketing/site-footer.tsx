/**
 * Rodapé — o wordmark à escala de assinatura e a informação mínima. Diz de
 * forma clara o que este projeto é (portfólio), sem letra pequena.
 */
import Link from "next/link";

const links = [
  { href: "#produto", label: "Produto" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Perguntas" },
  { href: "/login", label: "Entrar" },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 pt-20 pb-10 md:px-10">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <p className="font-display text-5xl leading-none tracking-tight text-foreground md:text-7xl">
              Nuvoly
            </p>
            <p className="label-technical mt-4 text-muted-foreground">
              Your inbox, intelligently managed.
            </p>
          </div>

          <nav className="flex flex-col gap-3" aria-label="Rodapé">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-technical underline-grow self-start text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl font-editorial text-[0.8125rem] leading-relaxed text-muted-foreground">
            Projeto de portfólio em desenvolvimento — não é um produto comercial
            ativo. Métricas, citações e preços na página são exemplos
            ilustrativos.
          </p>
          <p className="label-technical text-muted-foreground/70">
            © {new Date().getFullYear()} Nuvoly
          </p>
        </div>
      </div>
    </footer>
  );
}
