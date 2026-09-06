/**
 * Caderno I — a reportagem sobre o problema.
 *
 * Texto corrido em colunas verdadeiras (CSS multi-column, com filete entre
 * elas) e notas de margem, como num jornal. É deliberadamente a secção mais
 * "para ler" da página: dá ritmo entre a capa e as provas de produto.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const notes = [
  {
    term: "Regras e filtros",
    note: "Exigem que se preveja o futuro: o remetente que ainda não escreveu, o assunto que ainda não existe.",
  },
  {
    term: "Prioridade",
    note: "Aqui é sempre Alta, Média ou Baixa. A fórmula por trás nunca é mostrada — um número inventado não ajuda a decidir.",
  },
];

export function Report() {
  return (
    <section id="caderno-1" className="scroll-mt-32 border-b border-border">
      <div className="mx-auto max-w-[92rem] px-5 py-14 md:px-8 md:py-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Caderno I · Reportagem</p>
          <p className="folio text-muted-foreground">02</p>
        </div>

        <Reveal>
          <h2 className="misregister headline mt-8 max-w-4xl text-[clamp(2rem,5vw,4.25rem)] text-balance text-foreground">
            Ninguém precisa de mais email.
            <em className="font-normal italic"> Precisa de menos decisões.</em>
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Reveal>
              <div className="cols-2 column-text text-pretty text-foreground">
                <p className="mb-4">
                  A caixa de entrada moderna não falha por excesso de mensagens.
                  Falha porque todas chegam com o mesmo peso visual: a fatura
                  automática e o pedido urgente do cliente ocupam a mesma linha,
                  com o mesmo tipo de letra e a mesma hora ao lado.
                </p>
                <p className="mb-4">
                  A resposta habitual da indústria foi pedir ao utilizador que
                  organize: pastas, regras, etiquetas, filtros. Todos esses
                  sistemas partilham a mesma exigência — que se antecipe o que
                  ainda não aconteceu. Uma regra escrita em janeiro não sabe o
                  nome do fornecedor que vai escrever em março.
                </p>
                <p className="mb-4">
                  O trabalho difícil nunca foi mover mensagens de sítio. Foi
                  perceber, em cada manhã, quais é que mudam alguma coisa no
                  dia — e essa leitura ninguém a delegou até agora, porque
                  delegá-la exigia confiar num sistema que lê o conteúdo.
                </p>
                <p>
                  É aí que este produto se coloca, com uma condição declarada:
                  lê tudo, decide nada. A triagem é automática; a ação, nunca.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Notas de margem */}
          <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
            {notes.map((item, index) => (
              <Reveal key={item.term} delay={index * 0.08} className="mb-8 last:mb-0">
                <p className="folio text-primary">{item.term}</p>
                <p className="column-text mt-2 text-sm text-pretty text-muted-foreground">
                  {item.note}
                </p>
              </Reveal>
            ))}

            <Reveal delay={0.2}>
              <div className="border-t border-foreground pt-4">
                <p className="folio text-muted-foreground">Método, em três passos</p>
                <ol className="mt-3">
                  {[
                    ["I", "Ligar a caixa — ou entrar em demo, sem ligar nada."],
                    ["II", "A IA lê e classifica, com o resultado validado por schema."],
                    ["III", "Você confirma. Sempre, e com a contagem à frente."],
                  ].map(([numeral, text]) => (
                    <li key={numeral} className="flex gap-4 border-b border-border py-3 last:border-0">
                      <span className="folio shrink-0 text-primary">{numeral}</span>
                      <span className="column-text text-sm text-foreground">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
