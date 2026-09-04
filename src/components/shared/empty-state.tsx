import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Empty state elegante (spec §46) — reutilizado nas rotas ainda sem dados. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  footer,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {footer}
    </div>
  );
}
