"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Tag, Trash2, X } from "lucide-react";

import { createLabel, deleteLabel, renameLabel } from "@/app/actions/emails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LABEL_DOT_CLASSES } from "@/components/mail/label-chip";
import type { LabelWithCount } from "@/lib/emails/queries";
import type { LabelColorEnum } from "@/lib/emails/types";
import { cn } from "@/lib/utils";

const COLORS: LabelColorEnum[] = ["slate", "blue", "green", "amber", "purple", "rose"];

function ColorPicker({ value, onChange }: { value: LabelColorEnum; onChange: (c: LabelColorEnum) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          className={cn(
            "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
            value === color && "ring-2 ring-ring",
          )}
        >
          <span className={cn("size-4 rounded-full", LABEL_DOT_CLASSES[color])} />
        </button>
      ))}
    </div>
  );
}

export function LabelsManager({ labels }: { labels: LabelWithCount[] }) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState<LabelColorEnum>("blue");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await createLabel({ name: newName.trim(), color: newColor });
      setNewName("");
      setNewColor("blue");
      setIsCreating(false);
      toast.success("Label criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a label.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    try {
      await renameLabel(id, editingName.trim());
      setEditingId(null);
      toast.success("Label atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    try {
      await deleteLabel(id);
      toast.success("Label apagada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível apagar.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Organiza as tuas conversas com labels próprias.
          </p>
        </div>
        {!isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="size-4" />
            Nova label
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className={cn("size-3 shrink-0 rounded-full", LABEL_DOT_CLASSES[newColor])} />
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nome da label"
              className="h-8"
            />
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isSubmitting || !newName.trim()}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Criar
            </Button>
          </div>
        </div>
      )}

      {labels.length === 0 && !isCreating ? (
        <EmptyState
          icon={Tag}
          title="Ainda não tens labels."
          description="Cria a tua primeira label para começares a organizar as conversas."
        />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn("size-2.5 shrink-0 rounded-full", LABEL_DOT_CLASSES[label.color as LabelColorEnum] ?? "bg-slate-500")} />

              {editingId === label.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(label.id)}
                    className="h-8 flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleRename(label.id)} aria-label="Guardar">
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancelar">
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href={`/app/labels/${label.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline">
                    {label.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {label.threadCount} {label.threadCount === 1 ? "conversa" : "conversas"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(label.id);
                      setEditingName(label.name);
                    }}
                    aria-label="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:text-destructive"
                    onClick={() => handleDelete(label.id)}
                    disabled={pendingDeleteId === label.id}
                    aria-label="Apagar"
                  >
                    {pendingDeleteId === label.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
