/**
 * Editorial — a peça de opinião da edição, onde a diferenciação é
 * argumentada em vez de listada. Composição de página de opinião: filete
 * grosso em cima, título centrado, texto em colunas e a assinatura no fim.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const positions = [
  {
    common: "Um chatbot encostado à caixa de entrada",
    ours: "Um copiloto dentro do fluxo: resumo na conversa, rascunho no compose, ação onde já se está a trabalhar.",
  },
  {
    common: "A IA age e avisa depois",
    ours: "A IA propõe, mostra quantos itens são afetados e espera pelo clique.",
  },
  {
    common: "Resumos confiantes que inventam",
    ours: "Sem informação suficiente, o resumo diz isso — por desenho da arquitetura, não por sorte do modelo.",
  },
  {
    common: "Preso a um fornecedor de IA",
    ours: "Camada de provider abstraída: o modelo troca-se numa variável de ambiente.",
  },
];

export function Editorial() {
  return (
    <section id="editorial" className="scroll-mt-32 border-b border-border">
      <div className="mx-auto max-w-[92rem] px-5 py-14 md:px-8 md:py-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Editorial</p>
          <p className="folio text-muted-foreground">09</p>
        </div>

        <div className="mx-auto max-w-4xl pt-12 text-center">
          <Reveal>
            <h2 className="headline text-[clamp(2.25rem,5.5vw,4.5rem)] text-balance text-foreground">
              Contra o assistente que age sozinho.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="folio mt-5 text-muted-foreground">A redação · Nuvoly</p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="cols-2 column-text mx-auto mt-10 max-w-5xl text-pretty text-foreground">
            <p className="mb-4">
              Há uma corrida a mostrar assistentes que fazem tudo sozinhos:
              respondem, arquivam, apagam, decidem. A demonstração é sempre
              impressionante e o problema aparece sempre depois — no dia em que
              a ação errada já saiu, para a pessoa errada, sem ninguém ter
              chegado a ver o que ia acontecer.
            </p>
            <p className="mb-4">
              Este produto assume a posição contrária. A automação é toda na
              leitura, que é barata de errar: um resumo mau perde-se um minuto
              a reler. A ação fica do lado humano, porque é aí que os erros
              custam — e, quando o agente propõe alguma coisa sensível, tem de
              dizer antes quantos itens vai tocar.
            </p>
            <p>
              Não é uma limitação técnica à espera de ser removida numa versão
              seguinte. É a linha editorial do produto.
            </p>
          </div>
        </Reveal>

        <ul className="mx-auto mt-14 max-w-5xl border-t border-foreground">
          {positions.map((item, index) => (
            <Reveal
              key={item.common}
              as="li"
              delay={index * 0.06}
              className="grid grid-cols-1 gap-2 border-b border-border py-6 sm:grid-cols-[1fr_1.5fr] sm:gap-10"
            >
              <p className="column-text text-sm text-muted-foreground line-through decoration-muted-foreground/60">
                {item.common}
              </p>
              <p className="column-text text-pretty text-foreground">{item.ours}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
