/**
 * Erro de qualquer operação Gmail (auth, sync, send, drafts, labels).
 *
 * Spec §35 — nunca mostrar erros técnicos crus ao utilizador: todo o código
 * que fala com a Google lança `GmailError` com uma `userMessage` em PT-PT já
 * pronta para a UI; a mensagem técnica (`message`/`cause`) fica só para logs.
 */
export class GmailError extends Error {
  readonly userMessage: string;
  /** Quando `true`, a única correção possível é o utilizador reconectar a conta (refresh token inválido/revogado). */
  readonly needsReconnect: boolean;

  constructor(
    message: string,
    options: { userMessage: string; needsReconnect?: boolean; cause?: unknown } ,
  ) {
    super(message, { cause: options.cause });
    this.name = "GmailError";
    this.userMessage = options.userMessage;
    this.needsReconnect = options.needsReconnect ?? false;
  }
}

export class GmailNotConnectedError extends GmailError {
  constructor() {
    super("Nenhuma conta Google associada a este utilizador.", {
      userMessage: "Ainda não ligou uma conta Gmail. Ligue uma conta em Definições → Contas.",
      needsReconnect: true,
    });
    this.name = "GmailNotConnectedError";
  }
}
