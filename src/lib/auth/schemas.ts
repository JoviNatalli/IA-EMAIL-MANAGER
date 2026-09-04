import { z } from "zod";

/**
 * Validação de credenciais (Fase 1 — demo/local auth).
 * A validação real de OAuth (Google) não passa por aqui — entra na Fase 3.
 */
export const loginSchema = z.object({
  email: z.email({ error: "Introduza um email válido." }).trim().toLowerCase(),
  password: z
    .string()
    .min(1, { error: "Introduza a sua password." }),
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, { error: "O nome deve ter pelo menos 2 caracteres." })
    .trim(),
  email: z.email({ error: "Introduza um email válido." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "A password deve ter pelo menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { error: "A password deve conter pelo menos uma letra." })
    .regex(/[0-9]/, { error: "A password deve conter pelo menos um número." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
