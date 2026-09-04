"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const FOCUS_AREAS = [
  { value: "work", label: "Work" },
  { value: "meetings", label: "Meetings" },
  { value: "clients", label: "Clients" },
  { value: "finance", label: "Finance" },
  { value: "personal", label: "Personal" },
  { value: "projects", label: "Projects" },
] as const;

const AI_LEVELS = [
  {
    value: "minimal",
    label: "Minimal",
    description: "A IA só age quando lhe pede explicitamente.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Sugestões prontas a rever; nada é enviado sem confirmar.",
  },
  {
    value: "proactive",
    label: "Proactive",
    description: "A IA antecipa-se — resumos, prioridades e rascunhos automáticos.",
  },
] as const;

type ToggleKey =
  | "autoCategorization"
  | "priorityDetection"
  | "dailyBriefing"
  | "smartReplySuggestions";

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  {
    key: "autoCategorization",
    label: "Automatic categorization",
    description: "Classificar emails por categoria automaticamente.",
  },
  {
    key: "priorityDetection",
    label: "Priority detection",
    description: "Identificar o que precisa da sua atenção primeiro.",
  },
  {
    key: "dailyBriefing",
    label: "Daily briefing",
    description: "Um resumo do que importa, todas as manhãs.",
  },
  {
    key: "smartReplySuggestions",
    label: "Smart reply suggestions",
    description: "Respostas rápidas sugeridas com base no contexto.",
  },
];

const STEPS = ["Conta", "Foco", "Estilo de IA", "Funcionalidades"] as const;

export function OnboardingFlow() {
  const [step, setStep] = React.useState(0);
  const [focusAreas, setFocusAreas] = React.useState<string[]>([]);
  const [aiLevel, setAiLevel] =
    React.useState<(typeof AI_LEVELS)[number]["value"]>("balanced");
  const [toggles, setToggles] = React.useState<Record<ToggleKey, boolean>>({
    autoCategorization: true,
    priorityDetection: true,
    dailyBriefing: true,
    smartReplySuggestions: true,
  });
  const [isPending, startTransition] = useTransition();

  const canAdvance = step !== 1 || focusAreas.length > 0;

  function toggleFocusArea(value: string) {
    setFocusAreas((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function finish() {
    startTransition(() =>
      completeOnboarding({
        focusAreas: focusAreas as never,
        aiAssistanceLevel: aiLevel,
        ...toggles,
      }),
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 flex items-center gap-1.5">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                index <= step ? "bg-primary" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "text-xs",
                index === step
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {step === 0 && <StepConnectAccount />}
        {step === 1 && (
          <StepFocusAreas selected={focusAreas} onToggle={toggleFocusArea} />
        )}
        {step === 2 && <StepAiLevel value={aiLevel} onChange={setAiLevel} />}
        {step === 3 && (
          <StepToggles
            values={toggles}
            onChange={(key, value) =>
              setToggles((prev) => ({ ...prev, [key]: value }))
            }
          />
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || isPending}
            onClick={() => setStep((s) => s - 1)}
          >
            Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button type="button" disabled={isPending} onClick={finish}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepConnectAccount() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Ligar conta de email
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A integração real com Gmail chega na Fase 3. Por agora, continue com
          os dados de demonstração — sem qualquer conta real ligada.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          A usar <span className="font-medium">Demo Mode</span> — pode ligar o
          Gmail mais tarde em Definições → Contas ligadas.
        </p>
      </div>
    </div>
  );
}

function StepFocusAreas({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          O que é mais importante para si?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usamos isto para priorizar categorias assim que a IA estiver ligada.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {FOCUS_AREAS.map((area) => {
          const checked = selected.includes(area.value);
          return (
            <label
              key={area.value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors",
                checked
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(area.value)}
              />
              {area.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StepAiLevel({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: (typeof AI_LEVELS)[number]["value"]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Nível de assistência da IA
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pode alterar isto a qualquer momento em Definições.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {AI_LEVELS.map((level) => (
          <label
            key={level.value}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3.5 text-sm transition-colors",
              value === level.value
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:bg-accent/50",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name="ai-level"
                className="accent-primary"
                checked={value === level.value}
                onChange={() => onChange(level.value)}
              />
              {level.label}
            </span>
            <span className="pl-5 text-muted-foreground">
              {level.description}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepToggles({
  values,
  onChange,
}: {
  values: Record<ToggleKey, boolean>;
  onChange: (key: ToggleKey, value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Ativar funcionalidades
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas ficam disponíveis assim que os dados da inbox existirem.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {TOGGLES.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between gap-4 p-3.5"
          >
            <div>
              <Label htmlFor={toggle.key} className="text-sm">
                {toggle.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {toggle.description}
              </p>
            </div>
            <Switch
              id={toggle.key}
              checked={values[toggle.key]}
              onCheckedChange={(checked) => onChange(toggle.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
