/**
 * Caderno III — verificação.
 *
 * A secção de prova social, tratada como a caixa de fact-check de um jornal:
 * cada afirmação vem com a sua fonte e com o selo do que é demonstração.
 * O master-spec (§8/§13) exige que dados fictícios sejam identificados como
 * exemplos; aqui isso não é um aviso em letra pequena, é o formato da
 * própria secção.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const claims = [
  {
    value: "24 → 3",
    claim: "conversas retidas depois da triagem, num dia do dataset de demonstração",
    source: "Demonstração",
    verified: false,
  },
  {
    value: "0",
    claim: "ações sensíveis executadas sem confirmação explícita do utilizador",
    source: "Arquitetura — verificável no código",
    verified: true,
  },
  {
    value: "20",
    claim: "ferramentas disponíveis ao agente: pesquisar, ler, resumir, arquivar, etiquetar, criar tarefas",
    source: "Arquitetura — verificável no código",
    verified: true,
  },
];

const letters = [
  {
    quote:
      "Passei de quarenta emails abertos por dia a rever rascunhos já escritos. O tempo em copy de resposta caiu para quase zero.",
    who: "Gestora de produto, fintech",
  },
  {
    quote:
      "O que me convenceu foi a IA dizer «não tenho essa informação» em vez de inventar um resumo.",
    who: "Fundador de startup",
  },
  {
    quote: "A extração de tarefas poupa-me o hábito de copiar tudo para outro sítio à mão.",
    who: "Freelancer, design",
  },
];

export function Verification() {
  return (
    <section id="caderno-3" className="scroll-mt-32 border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-[92rem] px-5 py-14 md:px-8 md:py-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Caderno III · Verificação</p>
          <p className="folio text-muted-foreground">07</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="headline text-[clamp(2rem,4.5vw,3.75rem)] text-balance text-foreground">
                O que aqui é real e o que é demonstração.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="column-text mt-5 text-pretty text-muted-foreground">
                Este é um projeto de portfólio: não tem clientes, contratos nem
                resultados de produção. Em vez de esconder isso em letra
                pequena, esta secção separa as duas coisas linha a linha — o
                que se pode verificar no código e o que vem de uma caixa de
                entrada inventada.
              </p>
            </Reveal>
          </div>

          <dl className="lg:col-span-7">
            {claims.map((item, index) => (
              <Reveal
                key={item.value}
                delay={index * 0.07}
                className="grid grid-cols-1 gap-4 border-b border-border py-6 sm:grid-cols-[9rem_1fr] sm:gap-8"
              >
                <dt className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,4vw,3.5rem)] leading-none text-foreground">
                  {item.value}
                </dt>
                <dd>
                  <p className="column-text text-pretty text-foreground">{item.claim}</p>
                  <p className="folio mt-2 flex items-center gap-2 text-muted-foreground">
                    <span
                      aria-hidden
                      className={
                        item.verified
                          ? "inline-block size-1.5 bg-primary"
                          : "inline-block size-1.5 bg-warning"
                      }
                    />
                    Fonte: {item.source}
                  </p>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <div className="mt-14 border-t border-foreground pt-6">
          <p className="folio text-warning">
            Citações abaixo: escritas como exemplo — não são pessoas reais
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
            {letters.map((item, index) => (
              <Reveal key={item.who} delay={index * 0.07}>
                <blockquote className="font-[family-name:var(--font-editorial)] text-lg leading-snug text-balance text-foreground italic">
                  {item.quote}
                </blockquote>
                <p className="folio mt-3 text-muted-foreground">Exemplo fictício · {item.who}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
