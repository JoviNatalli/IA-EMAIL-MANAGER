import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-8 py-16 text-center shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Pronto para uma inbox mais calma?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Comece em Demo Mode em menos de um minuto — sem cartão, sem ligar
          conta nenhuma.
        </p>
        <Button size="lg" asChild>
          <Link href="/login">
            Começar agora
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
