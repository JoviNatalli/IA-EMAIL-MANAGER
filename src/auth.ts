import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/lib/auth/config";
import { loginSchema } from "@/lib/auth/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // O Auth.js desliga o adapter para o Credentials provider (exige sessão
  // JWT — ver authConfig), mas mantê-lo aqui já deixa a tabela `account`
  // pronta para o Google provider real da Fase 3.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user?.passwordHash) return null;

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })
    // ↑ Fase 3: liga OAuth real + scopes do Gmail. Mantido comentado para não
    // quebrar o build enquanto AUTH_GOOGLE_ID/SECRET não existem.
  ],
});
