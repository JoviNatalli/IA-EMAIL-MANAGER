const steps = [
  {
    number: "01",
    title: "Ligue a sua inbox",
    description:
      "Gmail ou Outlook, via OAuth seguro — ou explore primeiro em Demo Mode, sem ligar conta nenhuma.",
  },
  {
    number: "02",
    title: "A IA aprende o que importa",
    description:
      "Categorização, prioridade e contexto ficam prontos a partir dos seus focos definidos no onboarding.",
  },
  {
    number: "03",
    title: "Trabalhe com um copiloto",
    description:
      "Resuma, responda, extraia tarefas e pesquise em linguagem natural — sempre com confirmação antes de agir.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Como funciona
          </h2>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-2">
              <span className="text-sm font-mono text-primary">
                {step.number}
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
