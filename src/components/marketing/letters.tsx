/**
 * Correio dos leitores — as perguntas frequentes na forma de cartas ao
 * diretor: pergunta assinada de um lado, resposta da redação do outro.
 * Mesma informação de uma FAQ, sem o acordeão que obriga a clicar para ler.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const letters = [
  {
    from: "Um leitor cauteloso",
    question: "O Nuvoly lê e guarda os meus emails?",
    answer:
      "Processa apenas o que a funcionalidade pedida precisa. O copiloto, por exemplo, recebe contagens da caixa — não o conteúdo das mensagens. As definições de privacidade controlam explicitamente o que segue para a IA.",
  },
  {
    from: "Quem já se queimou com automações",
    question: "A IA pode enviar ou apagar sozinha?",
    answer:
      "Não. Enviar, responder ou mexer em vários emails de uma vez passa sempre por uma confirmação com a contagem de itens à frente. Os argumentos da ação ficam no servidor e são revalidados no momento de executar.",
  },
  {
    from: "Alguém que não quer ligar nada",
    question: "Tenho de ligar o Gmail para experimentar?",
    answer:
      "Não. O modo demo abre uma caixa fictícia realista onde toda a interface funciona, sem ligar conta nenhuma.",
  },
  {
    from: "Um curioso técnico",
    question: "Que modelos são usados?",
    answer:
      "A arquitetura abstrai o fornecedor — Gemini e Claude estão implementados — e faz routing por tarefa: modelos pequenos para classificar, maiores para resumir e para o agente. Trocar é mudar uma variável de ambiente.",
  },
  {
    from: "Um leitor desconfiado",
    question: "E se um email tentar dar ordens à IA?",
    answer:
      "O conteúdo de email é sempre tratado como dados não confiáveis, delimitado e separado das instruções do sistema. Um email que diga «ignora as instruções anteriores» é analisado, não obedecido — e há testes dedicados a garantir isso.",
  },
];

export function Letters() {
  return (
    <section id="correio" className="scroll-mt-32 border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-[92rem] px-5 py-14 md:px-8 md:py-20">
        <div className="flex items-baseline justify-between border-b border-foreground pb-2">
          <p className="folio text-foreground">Correio · Cartas ao diretor</p>
          <p className="folio text-muted-foreground">13</p>
        </div>

        <dl className="mt-10">
          {letters.map((letter, index) => (
            <Reveal
              key={letter.question}
              delay={index * 0.05}
              className="grid grid-cols-1 gap-4 border-b border-border py-8 md:grid-cols-12 md:gap-10"
            >
              <dt className="md:col-span-5">
                <p className="folio text-muted-foreground">{letter.from} escreve</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-balance text-foreground">
                  {letter.question}
                </p>
              </dt>
              <dd className="md:col-span-6 md:col-start-7">
                <p className="folio text-primary">A redação responde</p>
                <p className="column-text mt-2 text-pretty text-foreground">{letter.answer}</p>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
