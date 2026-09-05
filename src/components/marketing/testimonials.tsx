const examples = [
  {
    quote:
      "Passei de 40 emails abertos por dia para reviewer de rascunhos prontos. O tempo em copy de resposta caiu para quase zero.",
    name: "Exemplo — PM em fintech",
  },
  {
    quote:
      "O que me convenceu foi a IA dizer \"não tenho essa informação\" em vez de inventar um resumo. Isso é raro.",
    name: "Exemplo — Founder de startup",
  },
  {
    quote:
      "A extração de tarefas a partir de emails poupa-me o hábito de copiar tudo para o Notion manualmente.",
    name: "Exemplo — Freelancer",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          O que dizem sobre o Nuvoly
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Nuvoly é um projeto de portfólio em desenvolvimento — os
          depoimentos abaixo são{" "}
          <span className="font-medium text-foreground">
            exemplos ilustrativos
          </span>
          , não citações de clientes reais.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {examples.map((example) => (
          <figure
            key={example.name}
            className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5"
          >
            <blockquote className="text-sm text-foreground">
              “{example.quote}”
            </blockquote>
            <figcaption className="text-xs text-muted-foreground">
              {example.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
