import { Bot } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function AiAssistantPage() {
  return (
    <EmptyState
      icon={Bot}
      title="O copiloto ainda não está ligado."
      description="O AI Assistant com contexto da aplicação, tool calling e streaming (spec §25–27) é construído nas Fases 4–6, sobre uma camada de provider abstraída (OpenAI / Anthropic / Gemini)."
    />
  );
}
