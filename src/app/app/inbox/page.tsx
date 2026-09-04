import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function InboxPage() {
  return (
    <EmptyState
      icon={Inbox}
      title="A sua inbox está pronta."
      description="Os emails de demonstração e a integração real com Gmail chegam nas Fases 2 e 3. Por agora, explore a navegação e as definições."
    />
  );
}
