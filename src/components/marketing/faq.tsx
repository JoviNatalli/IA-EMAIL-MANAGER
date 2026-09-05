import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O Nuvoly lê e guarda o conteúdo dos meus emails?",
    answer:
      "Só processa o que for necessário para a funcionalidade pedida (princípio de \"minimum necessary context\"), e as opções de privacidade em Definições controlam explicitamente se o conteúdo é enviado à IA e se as conversas com o assistente são guardadas.",
  },
  {
    question: "A IA pode enviar ou apagar emails sozinha?",
    answer:
      "Não. Qualquer ação sensível — enviar, apagar, mover em massa — exige confirmação explícita, mostrando sempre quantos itens seriam afetados antes de agir.",
  },
  {
    question: "Preciso de ligar o Gmail para experimentar?",
    answer:
      "Não. O Demo Mode dá acesso a um conjunto de dados fictício e realista para explorar toda a interface sem ligar nenhuma conta real.",
  },
  {
    question: "Que modelos de IA são usados?",
    answer:
      "A arquitetura abstrai o provider (OpenAI, Anthropic ou Gemini) e faz routing por tarefa — modelos mais pequenos para classificação simples, mais avançados para raciocínio complexo — configurável sem reescrever a lógica da aplicação.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Perguntas frequentes
        </h2>
      </div>

      <Accordion type="single" collapsible className="mt-12 w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.question} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
