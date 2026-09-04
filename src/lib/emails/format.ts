/** Formatação partilhada pela UI de email (lista, thread, compose). */

export function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const AVATAR_PALETTE = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];

/** Cor determinística a partir do email — o mesmo remetente fica sempre com a mesma cor. */
export function avatarColorFor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

const timeFormatter = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("pt-PT", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });
const dateYearFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Timestamp compacto para a lista: hora hoje, dia da semana esta semana, "12 ago" senão. */
export function formatMailTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) return timeFormatter.format(date);
  if (diffDays < 6) return weekdayFormatter.format(date);
  if (date.getFullYear() === now.getFullYear()) return dateFormatter.format(date);
  return dateYearFormatter.format(date);
}

export function formatFullTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function participantLabel(p: { name: string | null; email: string }): string {
  return p.name?.trim() || p.email;
}
