/**
 * Diferenciação — a secção mais gráfica da página: duas colunas em tensão,
 * o que a maioria faz (riscado) contra o que o Nuvoly faz. Sem tabela de
 * checkmarks, sem comparações com concorrentes nomeados.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const contrasts = [
  {
    common: "Um chatbot encostado à inbox",
    ours: "Um copiloto dentro do fluxo: resumo na thread, rascunho no compose, ações no sítio onde já está.",
  },
  {
    common: "A IA age e avisa depois",
    ours: "A IA propõe, mostra quantos itens são afetados e espera pelo seu clique.",
  },
  {
    common: "Resumos confiantes que inventam",
    ours: "Se a conversa não tem informação suficiente, o resumo diz isso — por regra da arquitetura, não por sorte do modelo.",
  },
  {
    common: "Preso a um fornecedor de IA",
    ours: "Camada de provider abstraída: o modelo troca-se numa variável de ambiente, sem reescrever a lógica.",
  },
];

export function Difference() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 py-28 md:px-10 md:py-36">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="label-technical flex items-center gap-3 text-muted-foreground">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Diferença
            </p>
            <Reveal>
              <h2 className="display-poster mt-8 max-w-md font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.94] tracking-[-0.02em] text-balance text-foreground">
                Não é um chatbot ao lado da inbox.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-7 max-w-sm font-editorial leading-relaxed text-pretty text-muted-foreground">
                A diferença não está no modelo — está em onde a IA vive e em
                quem manda. Aqui ela vive dentro do trabalho e nunca fica com a
                última palavra.
              </p>
            </Reveal>
          </div>

          <ul className="lg:col-span-7">
            {contrasts.map((item, index) => (
              <Reveal
                key={item.common}
                as="li"
                delay={index * 0.06}
                className="grid grid-cols-1 gap-3 border-t border-border py-8 sm:grid-cols-[1fr_1.4fr] sm:gap-10 sm:py-10"
              >
                <p className="font-editorial text-sm text-muted-foreground line-through decoration-muted-foreground/60">
                  {item.common}
                </p>
                <p className="font-editorial text-base leading-relaxed text-pretty text-foreground">
                  {item.ours}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
