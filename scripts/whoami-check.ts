import { db } from "../src/lib/db";
import { users, accounts } from "../src/lib/db/schema";

async function main() {
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  console.log("=== users ===");
  console.table(allUsers);

  const allAccounts = await db
    .select({ userId: accounts.userId, provider: accounts.provider, providerAccountId: accounts.providerAccountId })
    .from(accounts);
  console.log("=== accounts (google/etc ligadas) ===");
  console.table(allAccounts);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
