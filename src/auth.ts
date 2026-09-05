import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, sessions, userPreferences, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/lib/auth/config";
import { loginSchema } from "@/lib/auth/schemas";
import { GMAIL_OAUTH_SCOPES } from "@/lib/google/scopes";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // O Auth.js desliga o adapter para o Credentials provider (exige sessão
  // JWT — ver authConfig), mas mantê-lo aqui garante que o `linkAccount` do
  // adapter corre para o Google provider (login OAuth), gravando
  // access_token/refresh_token/expires_at/scope na tabela `account` —
  // independente da estratégia de sessão escolhida (JWT vs. database).
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
    // Fase 3: login real com Google + acesso ao Gmail. `access_type: offline`
    // + `prompt: consent` garantem um `refresh_token` mesmo que o utilizador
    // já tenha autorizado a app antes (a Google só devolve refresh_token na
    // primeira autorização, a não ser que o consentimento seja forçado — spec
    // §30, tokens têm de sobreviver para lá da sessão de login).
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: GMAIL_OAUTH_SCOPES.join(" "),
        },
      },
    }),
  ],
  events: {
    // Corre uma única vez quando o adapter cria um novo `user` (signup via
    // Credentials já cria isto explicitamente na Server Action — ver
    // src/app/actions/auth.ts; para o Google, quem cria o user é o adapter,
    // por isso as preferências por omissão têm de ser criadas aqui).
    async createUser({ user }) {
      if (!user.id) return;
      await db
        .insert(userPreferences)
        .values({ userId: user.id })
        .onConflictDoNothing();
    },
  },
});
