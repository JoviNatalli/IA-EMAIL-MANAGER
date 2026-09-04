import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bot,
  Calendar,
  CheckSquare,
  FileEdit,
  Inbox,
  Send,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TriangleAlert,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Chave em `FolderCounts` (ver lib/emails/queries.ts) a mostrar como badge. */
  countKey?: "inbox" | "important" | "starred" | "sent" | "drafts" | "archive" | "trash";
};

/** Navegação primária — pastas da inbox (spec §10). */
export const primaryNav: NavItem[] = [
  { title: "Inbox", href: "/app/inbox", icon: Inbox, shortcut: "G I", countKey: "inbox" },
  { title: "Important", href: "/app/important", icon: TriangleAlert, countKey: "important" },
  { title: "Starred", href: "/app/starred", icon: Star },
  { title: "Sent", href: "/app/sent", icon: Send },
  { title: "Drafts", href: "/app/drafts", icon: FileEdit, countKey: "drafts" },
  { title: "Archive", href: "/app/archive", icon: Archive },
  { title: "Trash", href: "/app/trash", icon: Trash2 },
];

/** Navegação secundária — produtividade e IA. */
export const secondaryNav: NavItem[] = [
  { title: "Labels", href: "/app/labels", icon: Tag },
  { title: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { title: "Calendar", href: "/app/calendar", icon: Calendar },
  { title: "AI Assistant", href: "/app/ai", icon: Bot },
  { title: "Daily Briefing", href: "/app/briefing", icon: Sparkles },
];
