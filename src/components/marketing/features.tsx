import {
  Bot,
  CheckSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Resumos que não inventam",
    description:
      "Emails e conversas inteiras resumidos em segundos. Se a informação não existir, a IA diz — nunca inventa.",
  },
  {
    icon: Bot,
    title: "Respostas com o seu tom",
    description:
      "Descreva o que quer dizer, escolha o tom e o tamanho, e reveja antes de enviar. Nada sai sem a sua confirmação.",
  },
  {
    icon: Zap,
    title: "Prioridade automática",
    description:
      "A IA identifica o que precisa de resposta hoje — sem depender de regras manuais frágeis.",
  },
  {
    icon: CheckSquare,
    title: "Tarefas extraídas dos emails",
    description:
      "\"Envia-me a apresentação até sexta\" vira uma tarefa com prazo, sem trabalho manual.",
  },
  {
    icon: Search,
    title: "Pesquisa que entende contexto",
    description:
      "Operadores como from: e has:attachment, mais pesquisa semântica para o que não sabe descrever exatamente.",
  },
  {
    icon: ShieldCheck,
    title: "Segura por desenho",
    description:
      "Conteúdo de email é sempre tratado como não confiável — nunca pode alterar instruções do sistema ou disparar ações sem confirmação.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Tudo o que uma inbox moderna precisa
        </h2>
        <p className="mt-3 text-muted-foreground">
          Sem excesso de funcionalidades — cada uma resolve um problema real.
        </p>
      </div>

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent">
              <feature.icon className="size-4 text-accent-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
