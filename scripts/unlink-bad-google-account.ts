/**
 * Utilitário de debug (Fase 3): remove ligações Google indevidas.
 *
 * Contexto: o Auth.js, ao processar o callback OAuth, liga a conta Google
 * ao utilizador da SESSÃO ATIVA nesse momento em vez de criar um utilizador
 * novo (comportamento nativo de account-linking). Se testares o login
 * Google enquanto ainda tens uma sessão demo/credentials ativa, a conta
 * Google fica presa a esse utilizador para sempre — corrigido em
 * `signInWithGoogle()` (força signOut antes de iniciar o OAuth), mas isto
 * limpa qualquer ligação incorreta já gravada antes da correção.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { accounts } from "../src/lib/db/schema";

async function main() {
  const removed = await db
    .delete(accounts)
    .where(eq(accounts.provider, "google"))
    .returning({ userId: accounts.userId, providerAccountId: accounts.providerAccountId });

  console.log(`Removidas ${removed.length} ligação(ões) Google.`);
  console.table(removed);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
