import { cn } from "@/lib/utils";
import type { LabelColorEnum } from "@/lib/emails/types";

const LABEL_COLOR_CLASSES: Record<LabelColorEnum, string> = {
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export const LABEL_DOT_CLASSES: Record<LabelColorEnum, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  rose: "bg-rose-500",
};

export function LabelChip({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const colorKey = (color as LabelColorEnum) in LABEL_COLOR_CLASSES ? (color as LabelColorEnum) : "slate";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        LABEL_COLOR_CLASSES[colorKey],
        className,
      )}
    >
      {name}
    </span>
  );
}
