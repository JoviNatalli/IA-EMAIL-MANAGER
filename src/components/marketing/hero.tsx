import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Novo — AI Assistant com tool calling
        </span>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
          Your inbox,
          <br />
          intelligently managed.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
          A IA que lê, entende, organiza e ajuda a responder — um copiloto
          para a sua inbox, não apenas mais um chatbot ao lado.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/login">
              Começar grátis
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#workflow">
              <PlayCircle className="size-4" />
              Ver como funciona
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-16">
        <ProductPreview />
      </div>
    </section>
  );
}
