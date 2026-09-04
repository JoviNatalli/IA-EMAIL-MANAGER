import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe": sem providers que dependam de DB/bcrypt (Node runtime).
 * Usada pelo `proxy.ts` para checagens otimistas de sessão (spec: Proxy não
 * deve ser a única camada de autorização — ver `src/auth.ts` e os Server
 * Actions/Route Handlers para a checagem real por trás de cada mutação).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = request.nextUrl.pathname.startsWith("/app");
      const isOnOnboarding = request.nextUrl.pathname.startsWith("/onboarding");

      if (isOnApp || isOnOnboarding) {
        return isLoggedIn;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // preenchido em src/auth.ts (Credentials na Fase 1, Google na Fase 3)
} satisfies NextAuthConfig;
