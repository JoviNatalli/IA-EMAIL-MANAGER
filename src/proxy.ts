import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/config";

/**
 * Next.js 16: `middleware.ts` foi renomeado para `proxy.ts` (mesma função,
 * novo nome — ver node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
 *
 * Usa apenas `authConfig` (sem Credentials/DrizzleAdapter) para permanecer
 * leve aqui. Isto é uma checagem OTIMISTA de sessão — redireciona não
 * autenticados para longe de /app e /onboarding. A autorização real (por
 * utilizador, por recurso) continua a ser validada em cada Server
 * Action/Route Handler antes de tocar na base de dados (spec §18/§30).
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
