/**
 * Superfície de produto usada na secção "produto" (spec §8 — product preview
 * + AI interaction demo). Quatro estados que a narrativa vai trocando à
 * medida que o utilizador desce a página.
 *
 * Dados ilustrativos, sem qualquer chamada de rede — é uma reconstituição
 * fiel da UI real, não a app embebida.
 */
import { Archive, Check, Inbox, Send, ShieldAlert, Sparkles, Star, Tag } from "lucide-react";

import { cn } from "@/lib/utils";

export type SurfaceView = "triage" | "insights" | "reply" | "confirm";

export function ProductSurface({ view }: { view: SurfaceView }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/40">
      <div className="flex h-9 items-center gap-1.5 border-b border-border px-4">
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="label-technical ml-3 text-muted-foreground/70">nuvoly · inbox</span>
      </div>

      <div className="flex min-h-[19rem]">
        <nav className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar p-3 sm:flex">
          <RailItem icon={Inbox} label="Inbox" count="24" active />
          <RailItem icon={Star} label="Starred" />
          <RailItem icon={Archive} label="Archive" />
          <RailItem icon={Tag} label="Labels" />
          <RailItem icon={Sparkles} label="Copiloto" />
        </nav>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          {view === "triage" && <TriageView />}
          {view === "insights" && <InsightsView />}
          {view === "reply" && <ReplyView />}
          {view === "confirm" && <ConfirmView />}
        </div>
      </div>
    </div>
  );
}

function RailItem({
  icon: Icon,
  label,
  count,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 font-editorial text-xs",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {count && <span className="label-technical text-[0.625rem]">{count}</span>}
    </span>
  );
}

const rows = [
  { from: "Sofia Almeida", subject: "Bug crítico em produção", tone: "high" as const, unread: true },
  { from: "Priya Shah", subject: "Revisão do design do Q3", tone: "medium" as const, unread: true },
  { from: "Northwind Cloud", subject: "Fatura #4521", tone: "low" as const, unread: false },
  { from: "Product Weekly", subject: "Newsletter semanal", tone: "low" as const, unread: false },
];

function TriageView() {
  return (
    <div className="flex flex-col gap-3">
      <p className="label-technical text-muted-foreground">Precisa de atenção</p>
      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.subject}
            className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
          >
            <span
              className={cn(
                "h-8 w-px shrink-0",
                row.tone === "high" && "bg-priority-high",
                row.tone === "medium" && "bg-priority-medium",
                row.tone === "low" && "bg-priority-low/50",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-editorial text-xs",
                  row.unread ? "font-semibold text-card-foreground" : "text-muted-foreground",
                )}
              >
                {row.from}
              </p>
              <p className="truncate font-editorial text-xs text-muted-foreground">{row.subject}</p>
            </div>
            <span className="label-technical shrink-0 text-[0.625rem] text-muted-foreground/70">
              {row.tone === "high" ? "alta" : row.tone === "medium" ? "média" : "baixa"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsView() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {["Prioridade alta", "Trabalho", "Precisa de resposta"].map((tag) => (
          <span
            key={tag}
            className="label-technical rounded-full border border-border px-2.5 py-1 text-[0.625rem] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="font-editorial text-xs leading-relaxed text-card-foreground">
        A Sofia reporta erro 500 ao guardar preferências desde as 09h, associado
        ao deploy de ontem. Pede análise dos logs e uma atualização hoje.
      </p>
      <ul className="flex flex-col gap-1.5 border-l border-border pl-3">
        {[
          "Erro desde as 09h, a subir em número de reports",
          "Relacionado com o deploy da noite anterior",
          "Sofia aguarda ponto de situação",
        ].map((point) => (
          <li key={point} className="font-editorial text-[0.6875rem] text-muted-foreground">
            {point}
          </li>
        ))}
      </ul>
      <p className="rounded-md bg-accent/40 px-3 py-2 font-editorial text-[0.6875rem] text-accent-foreground">
        Sugestão: verificar os logs de produção e responder com o ponto de situação.
      </p>
    </div>
  );
}

function ReplyView() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Field label="Tom" value="Profissional" />
        <Field label="Comprimento" value="Média" />
      </div>
      <div className="rounded-md border border-border p-3">
        <p className="font-editorial text-xs leading-relaxed text-card-foreground">
          Olá Sofia, peço desculpa pela demora. Já estou a investigar os logs de
          produção para identificar a origem das falhas associadas ao deploy e
          dou-te uma atualização concreta dentro de uma hora.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="label-technical text-[0.625rem] text-muted-foreground">
          Rascunho · por rever
        </span>
        <span className="label-technical inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[0.625rem] text-background">
          <Send className="size-3" />
          Enviar
        </span>
      </div>
    </div>
  );
}

function ConfirmView() {
  return (
    <div className="flex flex-col gap-3">
      <p className="label-technical text-muted-foreground">Copiloto</p>
      <p className="font-editorial text-xs text-muted-foreground">
        &ldquo;Arquiva as newsletters desta semana&rdquo;
      </p>

      <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
        <p className="flex items-center gap-2 font-editorial text-xs font-semibold text-card-foreground">
          <ShieldAlert className="size-3.5 shrink-0 text-warning" />
          Confirmação necessária
        </p>
        <p className="mt-1.5 font-editorial text-[0.6875rem] text-muted-foreground">
          Arquivar 6 conversas etiquetadas como Newsletter.
        </p>
        <p className="mt-1 font-editorial text-[0.6875rem] text-muted-foreground">
          Itens afetados: <span className="font-semibold text-card-foreground">6</span>
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <span className="label-technical rounded-full px-3 py-1.5 text-[0.625rem] text-muted-foreground">
            Cancelar
          </span>
          <span className="label-technical inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[0.625rem] text-background">
            <Check className="size-3" />
            Confirmar
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
      <span className="label-technical text-[0.5625rem] text-muted-foreground">{label}</span>
      <span className="font-editorial text-xs text-card-foreground">{value}</span>
    </span>
  );
}
