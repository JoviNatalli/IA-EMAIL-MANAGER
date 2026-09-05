/** Rótulos PT-PT dos outputs estruturados de IA (spec §22/§23) — nunca a fórmula, só o resultado. */
export const CATEGORY_LABEL: Record<string, string> = {
  work: "Trabalho",
  personal: "Pessoal",
  finance: "Finanças",
  shopping: "Compras",
  social: "Social",
  newsletter: "Newsletter",
  meetings: "Reuniões",
  important: "Importante",
  promotional: "Promocional",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
};

export const PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};
