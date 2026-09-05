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

// Reutiliza a conexão entre hot-reloads em dev (evita esgotar o pool do Postgres).
const client =
  globalThis.__nuvolyPgClient ??
  postgres(connectionString, { max: process.env.NODE_ENV === "production" ? 10 : 1 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__nuvolyPgClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
