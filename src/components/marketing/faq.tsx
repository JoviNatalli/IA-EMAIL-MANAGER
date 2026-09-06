/**
 * FAQ em composição editorial: pergunta numerada à esquerda, resposta à
 * direita. Sem acordeão — as respostas são curtas e escondê-las só criaria
 * um clique extra.
 */
import { Reveal } from "@/components/marketing/motion-primitives";

const faqs = [
  {
    question: "O Nuvoly lê e guarda os meus emails?",
    answer:
      "Só processa o que a funcionalidade pedida precisa — o copiloto, por exemplo, recebe contagens da inbox, não o conteúdo das mensagens. As definições de privacidade controlam explicitamente o que é enviado para a IA.",
  },
  {
    question: "A IA pode enviar ou apagar emails sozinha?",
    answer:
      "Não. Enviar, responder ou mexer em vários emails de uma vez passa sempre por uma confirmação que mostra quantos itens são afetados. Os argumentos da ação ficam no servidor e são revalidados no momento de executar.",
  },
  {
    question: "Preciso de ligar o Gmail para experimentar?",
    answer:
      "Não. O modo demo abre uma inbox fictícia realista onde toda a interface funciona, sem ligar conta nenhuma.",
  },
  {
    question: "Que modelos de IA são usados?",
    answer:
      "A arquitetura abstrai o provider (Gemini e Claude implementados) e faz routing por tarefa: modelos pequenos para classificar, maiores para resumir e para o agente. Trocar é mudar uma variável de ambiente.",
  },
  {
    question: "E se um email tentar dar ordens à IA?",
    answer:
      "O conteúdo de email é sempre tratado como dados não confiáveis, delimitado e separado das instruções do sistema. Um email que diga «ignora as instruções anteriores» é analisado, não obedecido — e há testes dedicados a garantir isso.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative border-t border-border">
      <div className="mx-auto max-w-[104rem] px-6 py-28 md:px-10 md:py-36">
        <p className="label-technical flex items-center gap-3 text-muted-foreground">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          Perguntas
        </p>

        <dl className="mt-16 border-t border-border">
          {faqs.map((faq, index) => (
            <Reveal
              key={faq.question}
              delay={index * 0.05}
              className="grid grid-cols-1 gap-4 border-b border-border py-10 md:grid-cols-12 md:gap-8"
            >
              <dt className="md:col-span-5">
                <span className="label-technical mr-4 text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-2xl leading-tight tracking-tight text-balance text-foreground">
                  {faq.question}
                </span>
              </dt>
              <dd className="font-editorial leading-relaxed text-pretty text-muted-foreground md:col-span-6 md:col-start-7">
                {faq.answer}
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
