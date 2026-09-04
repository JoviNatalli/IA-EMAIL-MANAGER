"use client";

import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function AppearanceSection() {
  // `theme` fica `undefined` até o next-themes hidratar — sem precisar de um
  // estado "mounted" próprio controlado por efeito (evita re-render em cascata).
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
