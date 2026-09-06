import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-forms";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Entrar",
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Já existe uma conta com este email criada por password. Entre com email/password e ligue o Google depois em Definições.",
  AccessDenied: "O acesso com Google foi cancelado.",
  Configuration: "Integração com Google mal configurada no servidor. Tente novamente mais tarde.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const oauthError =
    typeof error === "string" ? (OAUTH_ERROR_MESSAGES[error] ?? "Não foi possível entrar com Google.") : undefined;

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/*
          Cabeçalho no registo da edição (Bodoni + filete duplo + fólio): o
          login é a porta de entrada vinda da homepage, e usar aqui a
          tipografia da app fazia a marca mudar de voz a meio do caminho. O
          formulário abaixo mantém-se em Geist — é superfície de aplicação,
          não de capa.
        */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block" aria-label="Nuvoly — início">
            <Logo size="lg" variant="edition" />
          </Link>
          <div className="rule-double mt-3">
            <p className="folio text-muted-foreground">
              Your inbox, intelligently managed.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <AuthCard oauthError={oauthError} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, concorda com os nossos termos e política de
          privacidade fictícios de demonstração.
        </p>
      </div>
    </div>
  );
}
