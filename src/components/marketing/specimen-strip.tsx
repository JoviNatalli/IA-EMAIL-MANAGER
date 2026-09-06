/**
 * Faixa de espécime — a régua técnica que atravessa a página.
 *
 * A ideia vem dos cartões de fundição tipográfica: metadados frios (eixos,
 * pesos, contagens) tratados como elemento gráfico. Aqui os "metadados" são
 * factos verdadeiros do produto e da própria fonte da página, o que evita o
 * ticker decorativo vazio que se vê em qualquer template.
 *
 * O conteúdo está duplicado de propósito: é o que permite o ciclo do
 * `marquee` fechar sem salto. A segunda cópia leva `aria-hidden` para não ser
 * lida duas vezes.
 */
import { cn } from "@/lib/utils";

const ITEMS = [
  "20 ferramentas no agente",
  "0 ações sensíveis sem confirmação",
  "Gemini · Claude — provider trocável",
  "Bricolage Grotesque · wdth 75–100",
  "Resumos que admitem não saber",
  "PT-PT nativo",
  "Demo sem cartão",
  "Conteúdo de email tratado como não confiável",
];

function Row({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => (
        <span key={item} className="label-technical flex items-center gap-6 px-6 text-muted-foreground">
          {item}
          <span aria-hidden className="inline-block size-1 rotate-45 bg-primary" />
        </span>
      ))}
    </div>
  );
}

export function SpecimenStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "marquee-host relative flex overflow-hidden border-y border-border py-3.5",
        className,
      )}
    >
      <div className="marquee-track flex w-max">
        <Row />
        <Row ariaHidden />
      </div>

      {/* Esbatimento nas pontas: o texto entra e sai em vez de ser cortado. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}
