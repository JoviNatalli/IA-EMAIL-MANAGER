/**
 * Sumário da edição — "nesta edição". Substitui o bloco de features que
 * qualquer landing tem: em vez de seis cartões com ícones, o índice de um
 * jornal, com fólio, título e chamada de uma linha.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const entries = [
  {
    folio: "02",
    id: "caderno-1",
    kind: "Reportagem",
    title: "O problema não é o volume",
    blurb: "Porque é que filtros e regras falham em caixas que mudam todos os dias.",
  },
  {
    folio: "04",
    id: "caderno-2",
    kind: "Provas de página",
    title: "Quatro momentos do produto",
    blurb: "Triagem, resumo, rascunho e o travão do agente, vistos de perto.",
  },
  {
    folio: "07",
    id: "caderno-3",
    kind: "Verificação",
    title: "O que é demonstração e o que é real",
    blurb: "Os números desta página vêm de uma inbox fictícia. Está tudo assinalado.",
  },
  {
    folio: "09",
    id: "editorial",
    kind: "Editorial",
    title: "Contra o assistente que age sozinho",
    blurb: "A diferença não está no modelo — está em quem fica com a última palavra.",
  },
  {
    folio: "11",
    id: "assinaturas",
    kind: "Assinaturas",
    title: "Tabela de preços",
    blurb: "Valores ilustrativos: não há cobrança neste projeto.",
  },
  {
    folio: "13",
    id: "correio",
    kind: "Correio",
    title: "Cartas ao diretor",
    blurb: "As perguntas que aparecem sempre, respondidas sem rodeios.",
  },
];

export function EditionIndex() {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-[92rem] px-5 py-10 md:px-8 md:py-14">
        <p className="folio border-b border-foreground pb-2 text-foreground">Nesta edição</p>

        <ol className="mt-6 grid grid-cols-1 gap-x-10 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry, index) => (
            <Reveal key={entry.folio} as="li" delay={index * 0.05}>
              <a
                href={`#${entry.id}`}
                className="group flex items-baseline gap-5 border-b border-border py-5 transition-colors hover:border-foreground"
              >
                <span className="folio shrink-0 text-muted-foreground transition-colors group-hover:text-primary">
                  {entry.folio}
                </span>
                <span className="min-w-0">
                  <span className="folio block text-muted-foreground">{entry.kind}</span>
                  <span className="mt-1 block font-[family-name:var(--font-display)] text-xl leading-tight text-foreground">
                    {entry.title}
                  </span>
                  <span className="column-text mt-1.5 block text-sm text-muted-foreground">
                    {entry.blurb}
                  </span>
                </span>
              </a>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
