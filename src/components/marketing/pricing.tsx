import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "€0",
    period: "/mês",
    description: "Para experimentar o essencial.",
    features: [
      "1 conta de email",
      "Resumos de email com IA",
      "Categorização automática",
      "Pesquisa por operadores",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€12",
    period: "/mês",
    description: "Para quem vive na inbox todos os dias.",
    features: [
      "Contas ilimitadas",
      "AI Assistant com tool calling",
      "Daily briefing + deteção de reuniões",
      "Pesquisa semântica",
      "Extração de tarefas",
    ],
    cta: "Experimentar Pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "€29",
    period: "/utilizador/mês",
    description: "Para equipas que partilham inboxes.",
    features: [
      "Tudo do Pro",
      "Labels e fluxos partilhados",
      "Controlo de privacidade por equipa",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Preços simples
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Preços ilustrativos — a app está em desenvolvimento (portfólio).
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col gap-6 rounded-xl border p-6",
                plan.highlighted
                  ? "border-primary bg-card shadow-lg shadow-primary/10"
                  : "border-border bg-card",
              )}
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "default" : "outline"}
                asChild
                className="mt-auto"
              >
                <Link href="/login">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
