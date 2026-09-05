/**
 * Erro de qualquer operação de IA (provider indisponível, resposta inválida,
 * rate limit, timeout).
 *
 * Spec §35 — nunca mostrar erros técnicos crus ao utilizador: todo o código
 * que fala com um provider de IA lança `AIError` com uma `userMessage` em
 * PT-PT já pronta para a UI (mesmo padrão do `GmailError` da Fase 3); a
 * mensagem técnica (`message`/`cause`) fica só para logs.
 */
export class AIError extends Error {
  readonly userMessage: string;

  constructor(message: string, options: { userMessage: string; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "AIError";
    this.userMessage = options.userMessage;
  }
}

/** A chave de API do provider configurado não está definida no servidor. */
export class AIProviderNotConfiguredError extends AIError {
  constructor(provider: string) {
    super(`Provider de IA "${provider}" sem chave de API configurada.`, {
      userMessage:
        "A funcionalidade de IA ainda não está configurada neste ambiente. Contacte o administrador.",
    });
    this.name = "AIProviderNotConfiguredError";
  }
}
