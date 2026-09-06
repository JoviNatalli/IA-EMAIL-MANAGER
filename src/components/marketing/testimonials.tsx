/**
 * Prova / credibilidade.
 *
 * Honestidade de produto (spec §8/§13): o Nuvoly é um projeto de portfólio,
 * não tem clientes. Portanto NADA aqui se apresenta como real — o aviso está
 * no topo da secção, em texto normal e legível, e cada número e cada citação
 * repete que é um cenário ilustrativo. Nunca escondido num tooltip.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const metrics = [
  { value: "24 → 3", caption: "conversas que sobram depois da triagem, num dia típico do dataset de demonstração" },
  { value: "0", caption: "ações sensíveis executadas sem confirmação explícita — é uma regra da arquitetura, não uma definição" },
  { value: "20", caption: "ferramentas que o agente pode usar: pesquisar, ler, resumir, arquivar, etiquetar, criar tarefas" },
];

const quotes = [
  {
    quote:
      "Passei de quarenta emails abertos por dia a rever rascunhos já escritos. O tempo em copy de resposta caiu para quase zero.",
    who: "Product manager, fintech",
  },
  {
    quote:
      "O que me convenceu foi a IA dizer «não tenho essa informação» em vez de inventar um resumo. Isso é raro.",
    who: "Fundadora de startup",
  },
  {
    quote:
      "A extração de tarefas poupa-me o hábito de copiar tudo para outro sítio à mão.",
    who: "Freelancer, design",
  },
];

export function Testimonials() {
  return (
    <section id="prova" className="relative border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 py-28 md:px-10 md:py-36">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-technical flex items-center gap-3 text-muted-foreground">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Prova
            </p>
            <Reveal>
              <h2 className="display-poster mt-8 max-w-2xl font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.94] tracking-[-0.02em] text-balance text-foreground">
                Números de uma inbox de demonstração.
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <p className="max-w-sm border-l border-warning/60 pl-4 font-editorial text-sm leading-relaxed text-muted-foreground">
              <span className="label-technical mb-1.5 block text-warning">Cenário ilustrativo</span>
              O Nuvoly é um projeto de portfólio em desenvolvimento. Não há
              clientes, contratos nem resultados de produção: os números abaixo
              vêm do dataset fictício do modo demo e as citações são exemplos
              escritos para ilustrar o produto — não são pessoas reais.
            </p>
          </Reveal>
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-px border-t border-border sm:grid-cols-3">
          {metrics.map((metric, index) => (
            <Reveal
              key={metric.value}
              delay={index * 0.08}
              className="border-b border-border py-10 sm:border-r sm:px-8 sm:last:border-r-0 sm:first:pl-0"
            >
              <dt className="display-poster font-display text-[clamp(3rem,6vw,5.5rem)] leading-none tracking-[-0.03em] text-foreground">
                {metric.value}
              </dt>
              <dd className="mt-5 max-w-xs font-editorial text-sm leading-relaxed text-muted-foreground">
                {metric.caption}
              </dd>
            </Reveal>
          ))}
        </dl>

        <div className="mt-24 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {quotes.map((item, index) => (
            <Reveal key={item.who} delay={index * 0.08} className="flex flex-col gap-5">
              <span aria-hidden className="font-display text-5xl leading-none text-primary/60">
                &ldquo;
              </span>
              <blockquote className="font-editorial text-lg leading-snug text-balance text-foreground">
                {item.quote}
              </blockquote>
              <p className="label-technical text-muted-foreground">
                Exemplo fictício · {item.who}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
