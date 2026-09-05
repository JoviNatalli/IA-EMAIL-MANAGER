"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { userPreferences, users } from "@/lib/db/schema";
import { loginSchema, signupSchema } from "@/lib/auth/schemas";

export type AuthActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

export async function authenticateWithCredentials(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Verifique os campos abaixo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/app/inbox",
    });
    return { status: "success" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message:
          error.type === "CredentialsSignin"
            ? "Email ou password incorretos."
            : "Não foi possível iniciar sessão. Tente novamente.",
      };
    }
    // Next.js usa exceções para redirects internos do signIn — deixa propagar.
    throw error;
  }
}

/**
 * Login/signup real com Google (Fase 3) — o próprio `signIn` do Auth.js trata
 * do redirect para a Google e de volta; não há aqui nada para validar (isso
 * é o próprio OAuth) nem um `try/catch` a esconder erros de redirect.
 */
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/app/inbox" });
}

const DEMO_EMAIL = "demo@nuvoly.app";
const DEMO_PASSWORD = "demo1234";

/**
 * Login de um clique para o Demo Mode (spec §47) — o utilizador seeded por
 * `pnpm db:seed`. Não requer conta real nem OAuth.
 *
 * Assinatura compatível com `useActionState` (em vez de ser chamada
 * diretamente do cliente) para que o redirect interno do `signIn` — que o
 * Next.js implementa lançando um erro especial — não seja capturado por um
 * try/catch nosso no cliente e transformado num falso erro.
 */
export async function demoSignIn(
  _prevState: AuthActionState,
): Promise<AuthActionState> {
  try {
    await signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirectTo: "/app/inbox",
    });
    return { status: "success" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message:
          "Demo indisponível: corra `pnpm db:seed` no servidor para criar o utilizador de demonstração.",
      };
    }
    throw error;
  }
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Verifique os campos abaixo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return {
      status: "error",
      message: "Já existe uma conta com este email.",
      fieldErrors: { email: ["Já existe uma conta com este email."] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id });

  await db.insert(userPreferences).values({ userId: newUser.id });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    });
    return { status: "success" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Conta criada, mas não foi possível iniciar sessão automaticamente. Tente entrar manualmente.",
      };
    }
    throw error;
  }
}
