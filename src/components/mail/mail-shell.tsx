import { redirect } from "next/navigation";
import { Inbox as InboxIconFallback, type LucideIcon } from "lucide-react";

import { auth } from "@/auth";
import { getThread, listLabels, listThreads, type ThreadScope } from "@/lib/emails/queries";
import { getCachedAnalysis } from "@/app/actions/ai";
import { EmptyState } from "@/components/shared/empty-state";
import { ThreadList } from "@/components/mail/thread-list";
import { ThreadDetail, ThreadDetailEmpty } from "@/components/mail/thread-detail";
import { cn } from "@/lib/utils";

/**
 * Shell de duas colunas (lista + detail) partilhado por todas as pastas.
 * Cada rota (`/app/inbox`, `/app/starred/[threadId]`, `/app/labels/[labelId]`,
 * ...) é só uma casca fina à volta disto, com o `scope`/`basePath` certos.
 */
export async function MailShell({
  scope,
  basePath,
  title,
  threadId,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  scope: ThreadScope;
  basePath: string;
  title: string;
  threadId?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const currentUserEmail = session.user.email ?? "";

  const [items, labels, selected] = await Promise.all([
    listThreads(userId, scope),
    listLabels(userId),
    threadId ? getThread(userId, threadId) : Promise.resolve(null),
  ]);

  if (threadId && !selected) {
    redirect(basePath);
  }

  // Cache da análise de IA (spec §51) — lida aqui para não haver "flash" de
  // estado vazio no painel de insights ao abrir uma thread já analisada.
  const initialAnalysis = selected ? await getCachedAnalysis(selected.id).catch(() => null) : null;

  return (
    <div className="flex h-full min-h-0">
      <div
        className={cn(
          "w-full shrink-0 md:w-[360px] md:border-r md:border-border",
          threadId && "hidden md:block",
        )}
      >
        <ThreadList
          title={title}
          items={items}
          basePath={basePath}
          selectedThreadId={threadId}
          currentUserEmail={currentUserEmail}
          emptyState={
            emptyIcon && emptyTitle && emptyDescription ? (
              <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
            ) : (
              <EmptyState icon={InboxIconFallback} title="Nada por aqui." description="Não há emails nesta pasta." />
            )
          }
        />
      </div>
      <div className={cn("min-w-0 flex-1", !threadId && "hidden md:block")}>
        {selected ? (
          <ThreadDetail
            thread={selected}
            basePath={basePath}
            currentUserEmail={currentUserEmail}
            labels={labels}
            initialAnalysis={initialAnalysis}
          />
        ) : (
          <ThreadDetailEmpty />
        )}
      </div>
    </div>
  );
}
