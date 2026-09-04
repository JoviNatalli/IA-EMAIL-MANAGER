import { cn } from "@/lib/utils";

/** Wordmark tipográfico simples — sem ícone genérico de "envelope com IA". */
export function Logo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-baseline font-semibold tracking-tight text-foreground",
        size === "lg" ? "text-2xl" : "text-lg",
        className,
      )}
    >
      Mail<span className="text-primary">Mind</span>
    </span>
  );
}
