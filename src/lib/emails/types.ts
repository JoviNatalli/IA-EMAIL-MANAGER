import type {
  threadCategoryEnum,
  threadFolderEnum,
  threadPriorityEnum,
  labelColorEnum,
} from "@/lib/db/schema";

export type ThreadFolderEnum = (typeof threadFolderEnum.enumValues)[number];
export type ThreadPriorityEnum = (typeof threadPriorityEnum.enumValues)[number];
export type ThreadCategoryEnum = (typeof threadCategoryEnum.enumValues)[number];
export type LabelColorEnum = (typeof labelColorEnum.enumValues)[number];

export const FOLDER_LABELS: Record<ThreadFolderEnum, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
};

export const CATEGORY_LABELS: Record<ThreadCategoryEnum, string> = {
  work: "Trabalho",
  personal: "Pessoal",
  finance: "Financeiro",
  updates: "Atualizações",
  social: "Social",
  promotions: "Promoções",
};

export const PRIORITY_LABELS: Record<ThreadPriorityEnum, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
