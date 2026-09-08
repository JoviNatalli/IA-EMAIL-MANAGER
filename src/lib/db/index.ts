import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __nuvolyPgClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não está definida. Copie .env.example para .env.local e configure a connection string.",
  );
}

/**
 * Em serverless (Vercel, Fase 8) cada invocação pode acordar numa instância
 * nova, e um pool grande por instância multiplica-se pelo número de
 * instâncias até esgotar o limite de ligações do Postgres. Uma ligação por
 * instância, com o pooling verdadeiro delegado no pooler do Neon
 * (PgBouncer), é o que aguenta. Localmente também é 1, para não abrir
 * ligações a mais a cada hot-reload.
 */
const isServerless = Boolean(process.env.VERCEL);

/**
 * O pooler do Neon corre em modo transação, onde prepared statements com
 * nome não sobrevivem entre pedidos — o postgres.js usa-os por omissão e a
 * primeira query reutilizada falha com "prepared statement ... does not
 * exist". Desligá-los é obrigatório, não uma otimização.
 */
const client =
  globalThis.__nuvolyPgClient ??
  postgres(connectionString, {
    max: 1,
    ...(isServerless ? { prepare: false } : {}),
  });

// Guardar no global evita esgotar o Postgres com hot-reloads em dev; em
// serverless o módulo já é reutilizado enquanto a instância estiver quente.
if (process.env.NODE_ENV !== "production") {
  globalThis.__nuvolyPgClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
