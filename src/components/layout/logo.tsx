import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Wordmark tipográfico — sem ícone genérico de "envelope com IA".
 *
 * Duas variantes, porque o produto tem duas vozes:
 * - `app` (default): Geist, com "oly" no acento. É a que aparece dentro da
 *   aplicação, ao lado de uma UI densa. Não mudou.
 * - `edition`: Bodoni Moda, monótona, como o cabeçalho de uma publicação. É a
 *   da homepage e do login — as duas superfícies que fazem de capa.
 */
export function Logo({
  className,
  size = "default",
  variant = "app",
  style,
}: {
  className?: string;
  size?: "default" | "lg";
  variant?: "app" | "edition";
  /** Só usado pelo cabeçalho da homepage, que interpola o corpo no scroll. */
  style?: React.CSSProperties;
}) {
  if (variant === "edition") {
    return (
      <span
        style={style}
        className={cn(
          "misregister headline inline-block select-none leading-none text-foreground",
          size === "lg" ? "text-6xl sm:text-7xl" : "text-2xl",
          className,
        )}
      >
        Nuvoly
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex select-none items-baseline font-semibold tracking-tight text-foreground",
        size === "lg" ? "text-2xl" : "text-lg",
        className,
      )}
    >
      Nuv<span className="text-primary">oly</span>
    </span>
  );
}
