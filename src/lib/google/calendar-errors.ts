/**
 * Erros do Google Calendar (Fase 6, §21).
 *
 * Mesmo contrato do `GmailError` da Fase 3 (spec §35): a mensagem técnica
 * fica para os logs, a `userMessage` em PT-PT é a única coisa que chega à UI.
 * Classe própria e não reutilização do `GmailError` porque as duas ligações
 * são independentes — dizer "ligue o Gmail" quando o que falhou foi o
 * calendário mandava o utilizador arranjar a coisa errada.
 */
export class CalendarError extends Error {
  readonly userMessage: string;
  /** `true` quando a única correção possível é voltar a ligar o calendário. */
  readonly needsReconnect: boolean;

  constructor(
    message: string,
    options: { userMessage: string; needsReconnect?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "CalendarError";
    this.userMessage = options.userMessage;
    this.needsReconnect = options.needsReconnect ?? false;
  }
}

export class CalendarNotConnectedError extends CalendarError {
  constructor() {
    super("Google Calendar não ligado para este utilizador.", {
      userMessage: "O Google Calendar não está ligado. Ligue-o em Definições → Contas.",
      needsReconnect: true,
    });
    this.name = "CalendarNotConnectedError";
  }
}
