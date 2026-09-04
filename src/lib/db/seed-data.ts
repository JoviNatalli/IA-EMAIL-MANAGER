/**
 * Dataset fictício para o Demo Mode (spec §47/48).
 *
 * Tudo aqui é inventado: pessoas, empresas, domínios `.example` onde faz
 * sentido. Nenhuma informação pessoal real. `priority` e `category` são
 * valores estáticos deste seed — só passam a ser calculados por IA na
 * Fase 4 (ver nota em `schema.ts`).
 *
 * `hoursAgo` é relativo ao momento em que o seed corre, para a inbox
 * parecer sempre atual em vez de ficar com datas fixas a envelhecer.
 */

export const DEMO_USER_NAME = "Alex Rivera";
export const DEMO_USER_EMAIL = "demo@mailmind.app";

export type SeedFolder = "inbox" | "sent" | "drafts" | "archive" | "trash";
export type SeedPriority = "low" | "medium" | "high";
export type SeedCategory =
  | "work"
  | "personal"
  | "finance"
  | "updates"
  | "social"
  | "promotions";
export type SeedLabelColor =
  | "slate"
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "rose";

export interface SeedParticipant {
  name: string | null;
  email: string;
}

export interface SeedAttachment {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}

export interface SeedMessage {
  fromName: string | null;
  fromEmail: string;
  to?: SeedParticipant[];
  cc?: SeedParticipant[];
  body: string;
  hoursAgo: number;
  attachments?: SeedAttachment[];
  /** true = ainda não "enviado" (rascunho); omitido = enviado normalmente */
  draft?: boolean;
}

export interface SeedThread {
  subject: string;
  folder: SeedFolder;
  isStarred?: boolean;
  isRead?: boolean;
  priority?: SeedPriority;
  category?: SeedCategory;
  labels?: string[];
  messages: SeedMessage[];
}

export const DEMO_LABELS: { name: string; color: SeedLabelColor }[] = [
  { name: "Trabalho", color: "blue" },
  { name: "Clientes", color: "purple" },
  { name: "Financeiro", color: "green" },
  { name: "Viagens", color: "amber" },
  { name: "Newsletter", color: "slate" },
];

const you = (): SeedParticipant => ({ name: DEMO_USER_NAME, email: DEMO_USER_EMAIL });

export const DEMO_THREADS: SeedThread[] = [
  // ── Inbox ────────────────────────────────────────────────────────────
  {
    subject: "Bem-vindo ao MailMind 🎉",
    folder: "inbox",
    isRead: false,
    priority: "medium",
    category: "updates",
    messages: [
      {
        fromName: "Equipa MailMind",
        fromEmail: "team@mailmind.app",
        to: [you()],
        hoursAgo: 2,
        body: "Olá! A tua inbox está pronta.\n\nAlgumas coisas para experimentar: abre uma thread para veres o painel de detalhe, usa ⌘K para a command palette, e explora as labels no menu lateral.\n\nA partir da Fase 4 vamos ligar IA a sério — resumos, respostas sugeridas e deteção de prioridade. Por agora, esta inbox é só o dataset de demonstração.\n\n— Equipa MailMind",
      },
    ],
  },
  {
    subject: "Revisão do design do Q3 — feedback até sexta",
    folder: "inbox",
    isRead: false,
    priority: "high",
    category: "work",
    labels: ["Trabalho"],
    messages: [
      {
        fromName: "Priya Shah",
        fromEmail: "priya.shah@northwindlabs.com",
        to: [you()],
        hoursAgo: 20,
        body: "Olá Alex,\n\nPartilho o link para a review do design do Q3 — precisamos de feedback de todos até sexta-feira para conseguirmos fechar antes do sprint planning.\n\nPontos principais: novo fluxo de onboarding, revisão da paleta de cores e o componente de notificações.\n\nObrigada!\nPriya",
      },
      {
        fromName: "Priya Shah",
        fromEmail: "priya.shah@northwindlabs.com",
        to: [you()],
        hoursAgo: 4,
        body: "Só a confirmar que viste o email de baixo — ainda não vi o teu comentário no documento. Consegues dar uma vista de olhos hoje?",
      },
    ],
  },
  {
    subject: "Fatura #4521 — Northwind Cloud Hosting",
    folder: "inbox",
    isRead: true,
    priority: "medium",
    category: "finance",
    labels: ["Financeiro"],
    messages: [
      {
        fromName: "Northwind Cloud",
        fromEmail: "billing@northwindcloud.com",
        to: [you()],
        hoursAgo: 30,
        body: "A tua fatura mensal está disponível.\n\nPlano: Pro — 20 seats\nPeríodo: 1 a 31 de agosto\nTotal: ver anexo\n\nO pagamento será processado automaticamente no cartão registado dentro de 5 dias úteis.",
        attachments: [
          { fileName: "invoice-4521.pdf", fileType: "application/pdf", fileSizeBytes: 84213 },
        ],
      },
    ],
  },
  {
    subject: "Reunião reagendada: Sync semanal de produto",
    folder: "inbox",
    isRead: true,
    isStarred: true,
    priority: "high",
    category: "work",
    labels: ["Trabalho"],
    messages: [
      {
        fromName: "Marcus Webb",
        fromEmail: "marcus.webb@northwindlabs.com",
        to: [you()],
        hoursAgo: 50,
        body: "Alex, preciso de mover o sync semanal de quinta para sexta às 15h — surgiu um conflito com a demo do cliente. Fica bem para ti?",
      },
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Marcus Webb", email: "marcus.webb@northwindlabs.com" }],
        hoursAgo: 48,
        body: "Fica bem, sexta às 15h fica marcado. Podes atualizar o convite?",
      },
      {
        fromName: "Marcus Webb",
        fromEmail: "marcus.webb@northwindlabs.com",
        to: [you()],
        hoursAgo: 47,
        body: "Convite atualizado, obrigado! Vemo-nos sexta.",
      },
    ],
  },
  {
    subject: "A tua encomenda foi enviada",
    folder: "inbox",
    isRead: true,
    priority: "low",
    category: "updates",
    messages: [
      {
        fromName: "Cedar & Co",
        fromEmail: "orders@cedarandco.com",
        to: [you()],
        hoursAgo: 60,
        body: "A tua encomenda #88213 foi enviada e chega em 2-3 dias úteis.\n\nPodes acompanhar o envio a qualquer momento na tua conta.",
      },
    ],
  },
  {
    subject: "[Ação necessária] Verificação de segurança da conta",
    folder: "inbox",
    isRead: false,
    priority: "high",
    category: "updates",
    messages: [
      {
        fromName: "MailMind Security",
        fromEmail: "security@mailmind.app",
        to: [you()],
        hoursAgo: 6,
        body: "Detetámos um novo início de sessão na tua conta a partir de um dispositivo não reconhecido.\n\nSe foste tu, não precisas de fazer nada. Caso contrário, recomendamos que atualizes a tua palavra-passe em Definições → Conta.\n\n(Esta é uma notificação de exemplo do dataset de demo — nenhuma ação real é executada.)",
      },
    ],
  },
  {
    subject: "Proposta de parceria — vamos falar?",
    folder: "inbox",
    isRead: false,
    priority: "medium",
    category: "work",
    labels: ["Clientes"],
    messages: [
      {
        fromName: "Elena Fischer",
        fromEmail: "elena@brightlanestudio.com",
        to: [you()],
        hoursAgo: 15,
        body: "Olá Alex,\n\nSomos um estúdio de design a trabalhar com algumas startups em fase de crescimento e achámos que havia sinergia entre o vosso produto e os nossos clientes.\n\nTens disponibilidade para uma chamada de 20 minutos esta semana ou na próxima?\n\nCumprimentos,\nElena",
      },
    ],
  },
  {
    subject: "Newsletter semanal: Product & Design Weekly",
    folder: "inbox",
    isRead: true,
    priority: "low",
    category: "promotions",
    labels: ["Newsletter"],
    messages: [
      {
        fromName: "Product & Design Weekly",
        fromEmail: "hello@pdweekly.example",
        to: [you()],
        hoursAgo: 70,
        body: "Esta semana: como equipas pequenas estão a usar IA no design de produto, um caso de estudo sobre onboarding, e as vagas em destaque.\n\nLer online →",
      },
    ],
  },
  {
    subject: "Confirmação: Voo LIS→BER dia 14",
    folder: "inbox",
    isRead: true,
    priority: "medium",
    category: "personal",
    labels: ["Viagens"],
    messages: [
      {
        fromName: "SkyBridge Airlines",
        fromEmail: "noreply@skybridgeair.example",
        to: [you()],
        hoursAgo: 96,
        body: "A tua reserva está confirmada.\n\nVoo SB482 — Lisboa (LIS) → Berlim (BER)\nPartida: 14, 09:35 · Chegada: 14, 14:10\nLugar: 14C\n\nCheck-in online disponível 24h antes do voo.",
        attachments: [
          { fileName: "boarding-pass.pdf", fileType: "application/pdf", fileSizeBytes: 51402 },
        ],
      },
    ],
  },
  {
    subject: "Bug crítico em produção — precisa de atenção",
    folder: "inbox",
    isRead: false,
    isStarred: true,
    priority: "high",
    category: "work",
    labels: ["Trabalho"],
    messages: [
      {
        fromName: "Sofia Almeida",
        fromEmail: "sofia.almeida@northwindlabs.com",
        to: [you()],
        hoursAgo: 3,
        body: "Alex, temos utilizadores a reportar erro 500 ao guardar preferências desde as 09h. Já identifiquei que é relacionado com o deploy de ontem à noite.\n\nConsegues olhar para os logs quando puderes? Vou continuar a investigar entretanto.",
      },
      {
        fromName: "Sofia Almeida",
        fromEmail: "sofia.almeida@northwindlabs.com",
        to: [you()],
        hoursAgo: 1,
        body: "Alguma novidade? O número de reports está a subir.",
      },
    ],
  },

  // ── Sent ─────────────────────────────────────────────────────────────
  {
    subject: "Follow-up: orçamento para o site novo",
    folder: "sent",
    isRead: true,
    priority: "medium",
    category: "work",
    labels: ["Clientes"],
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Elena Fischer", email: "elena@brightlanestudio.com" }],
        hoursAgo: 40,
        body: "Olá Elena,\n\nObrigado pela chamada da semana passada. Segue em anexo o resumo do que discutimos — fico a aguardar o vosso orçamento revisto assim que possível.\n\nQualquer dúvida, estou disponível.\n\nCumprimentos,\nAlex",
      },
    ],
  },
  {
    subject: "Introdução — Alex <> equipa de design",
    folder: "sent",
    isRead: true,
    priority: "low",
    category: "work",
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Jonas Weber", email: "jonas@studiofjord.example" }],
        hoursAgo: 110,
        body: "Olá Jonas,\n\nO Marcus falou-me de ti e sugeriu que entrássemos em contacto — estamos à procura de apoio de design para um projeto no próximo trimestre.\n\nTens disponibilidade para uma conversa rápida nas próximas semanas?\n\nAbraço,\nAlex",
      },
    ],
  },
  {
    subject: "Confirmação de presença: Workshop de UX Research",
    folder: "sent",
    isRead: true,
    priority: "low",
    category: "work",
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Workshop UX Lisboa", email: "eventos@uxlisboa.example" }],
        hoursAgo: 130,
        body: "Confirmo a minha presença no workshop de dia 22. Obrigado pela organização!",
      },
    ],
  },

  // ── Drafts ───────────────────────────────────────────────────────────
  {
    subject: "Rascunho: Proposta de colaboração",
    folder: "drafts",
    isRead: true,
    priority: "medium",
    category: "work",
    labels: ["Clientes"],
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Elena Fischer", email: "elena@brightlanestudio.com" }],
        hoursAgo: 5,
        draft: true,
        body: "Olá Elena,\n\nObrigado pela proposta! Estive a analisar com a equipa e faz sentido avançarmos com uma primeira fase mais pequena antes de comprometer o orçamento todo.\n\nO que acham de",
      },
    ],
  },
  {
    subject: "Rascunho: Resposta ao bug crítico",
    folder: "drafts",
    isRead: true,
    priority: "high",
    category: "work",
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [{ name: "Sofia Almeida", email: "sofia.almeida@northwindlabs.com" }],
        hoursAgo: 1,
        draft: true,
        body: "Sofia, a olhar para os logs agora. Parece estar relacionado com a migration de",
      },
    ],
  },
  {
    subject: "(sem assunto)",
    folder: "drafts",
    isRead: true,
    priority: "low",
    category: "personal",
    messages: [
      {
        fromName: DEMO_USER_NAME,
        fromEmail: DEMO_USER_EMAIL,
        to: [],
        hoursAgo: 200,
        draft: true,
        body: "lembrar de",
      },
    ],
  },

  // ── Archive ──────────────────────────────────────────────────────────
  {
    subject: "Boas-vindas à equipa Northwind Labs!",
    folder: "archive",
    isRead: true,
    priority: "low",
    category: "work",
    messages: [
      {
        fromName: "Northwind Labs — RH",
        fromEmail: "hr@northwindlabs.com",
        to: [you()],
        hoursAgo: 1400,
        body: "Bem-vindo à equipa! Em anexo (dataset de demo, sem anexo real) encontras o guia de onboarding com tudo o que precisas para a primeira semana.\n\nQualquer dúvida, fala com o teu manager ou com a equipa de RH.",
      },
    ],
  },
  {
    subject: "Recibo de pagamento — Setembro",
    folder: "archive",
    isRead: true,
    priority: "low",
    category: "finance",
    labels: ["Financeiro"],
    messages: [
      {
        fromName: "Northwind Cloud",
        fromEmail: "billing@northwindcloud.com",
        to: [you()],
        hoursAgo: 800,
        body: "Pagamento processado com sucesso. Obrigado por seres cliente Northwind Cloud.",
      },
    ],
  },

  // ── Trash ────────────────────────────────────────────────────────────
  {
    subject: "🎉 Oferta especial: 70% de desconto só hoje!",
    folder: "trash",
    isRead: true,
    priority: "low",
    category: "promotions",
    messages: [
      {
        fromName: "MegaSale Deals",
        fromEmail: "deals@megasale.example",
        to: [you()],
        hoursAgo: 300,
        body: "Não percas! 70% de desconto em tudo, só hoje. Clica aqui antes que acabe.",
      },
    ],
  },
  {
    subject: "Convite para newsletter que nunca subscreveste",
    folder: "trash",
    isRead: true,
    priority: "low",
    category: "promotions",
    messages: [
      {
        fromName: "Weekly Insider",
        fromEmail: "news@randomdigest.example",
        to: [you()],
        hoursAgo: 250,
        body: "Subscreve a nossa newsletter para receberes as últimas novidades do setor, todas as semanas na tua caixa de entrada.",
      },
    ],
  },
];
