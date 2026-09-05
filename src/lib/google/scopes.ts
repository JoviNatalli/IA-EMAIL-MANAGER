/**
 * Scopes OAuth pedidos ao Google (Fase 3 — Gmail API).
 *
 * `openid`/`email`/`profile` são os defaults que o `next-auth/providers/google`
 * já pede para conseguir identificar o utilizador — repetidos aqui de forma
 * explícita porque estamos a substituir o `scope` por omissão do provider ao
 * passar `authorization.params.scope` (ver src/auth.ts).
 *
 * Os scopes `gmail.*` têm de corresponder exatamente aos ativados no ecrã de
 * consentimento OAuth da Google Cloud Console (Data Access), senão a Google
 * rejeita o pedido de autorização.
 */
export const GMAIL_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.labels",
] as const;
