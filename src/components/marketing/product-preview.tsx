import { Archive, Inbox, Sparkles, Star, Tag } from "lucide-react";

/**
 * Mockup estático da UI (spec §8: "product preview" + "AI interaction demo").
 * Dados ilustrativos, sem qualquer chamada de rede — não é a app real.
 */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/5">
        <div className="flex h-10 items-center gap-1.5 border-b border-border px-4">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-warning/50" />
          <span className="size-2.5 rounded-full bg-success/40" />
        </div>

        <div className="flex">
          <div className="hidden w-44 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4 sm:flex">
            <div className="flex flex-col gap-1">
              <PreviewNavItem icon={Inbox} label="Inbox" active count="128" />
              <PreviewNavItem icon={Star} label="Starred" />
              <PreviewNavItem icon={Archive} label="Archive" />
              <PreviewNavItem icon={Tag} label="Labels" />
            </div>
          </div>

          <div className="flex-1 p-5">
            <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Focus
            </p>
            <div className="flex flex-col gap-2">
              <PreviewEmailRow
                sender="Acme Inc."
                subject="Project deadline update"
                preview="The deadline has been moved to Friday, please confirm the new timeline..."
                priority
              />
              <PreviewEmailRow
                sender="Sarah Chen"
                subject="Project proposal — final version"
                preview="I've attached the latest version with the budget changes..."
              />
              <PreviewEmailRow
                sender="John Smith"
                subject="Meeting tomorrow"
                preview="Are you available Tuesday at 15:00 to review the roadmap?"
              />
            </div>
          </div>

          <div className="hidden w-64 shrink-0 flex-col gap-3 border-l border-border p-4 lg:flex">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              AI INSIGHTS
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <p className="font-medium text-foreground">Summary</p>
              <p className="text-muted-foreground">
                Acme moveu o deadline do projeto para sexta e pede confirmação
                da nova timeline.
              </p>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <p className="font-medium text-foreground">Priority</p>
              <span className="w-fit rounded-md bg-priority-high/10 px-1.5 py-0.5 font-medium text-priority-high">
                High
              </span>
            </div>
            <div className="mt-1 rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground">
              Draft reply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewNavItem({
  icon: Icon,
  label,
  active,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  count?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70"
      }`}
    >
      <Icon className="size-3.5" />
      <span className="flex-1">{label}</span>
      {count && <span className="text-[10px] opacity-60">{count}</span>}
    </div>
  );
}

function PreviewEmailRow({
  sender,
  subject,
  preview,
  priority,
}: {
  sender: string;
  subject: string;
  preview: string;
  priority?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{sender}</span>
        {priority && (
          <span className="rounded bg-priority-high/10 px-1.5 py-0.5 text-[10px] font-medium text-priority-high">
            Important
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium text-foreground">{subject}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{preview}</p>
    </div>
  );
}
