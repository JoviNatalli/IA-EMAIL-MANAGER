"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  authenticateWithCredentials,
  demoSignIn,
  signInWithGoogle,
  signup,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = { status: "idle" };

export function AuthCard({ oauthError }: { oauthError?: string }) {
  return (
    <div className="flex flex-col gap-6">
      {oauthError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {oauthError}
        </p>
      )}

      <GoogleButton />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou</span>
        <Separator className="flex-1" />
      </div>

      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Criar conta</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-6">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.5-6.5C35.3 2.6 30 0.5 24 0.5 14.9 0.5 7 5.7 3.2 13.3l7.6 5.9C12.6 13.5 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.8 6.8-17.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.8 28.2c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.6-5.9C1.5 16.4 0.5 20.1 0.5 23.5s1 7.1 2.7 10.6l7.6-5.9z"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6 0 11.3-2 15.1-5.4l-7.3-5.7c-2 1.4-4.7 2.2-7.8 2.2-6.2 0-11.4-4-13.2-9.6l-7.6 5.9C7 42.3 14.9 47.5 24 47.5z"
      />
    </svg>
  );
}

function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit" variant="outline" className="w-full gap-2">
        <GoogleIcon className="size-4" />
        Continuar com Google
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-destructive">{messages[0]}</p>;
}

function SignInForm() {
  const [state, formAction, isPending] = useActionState(
    authenticateWithCredentials,
    initialState,
  );

  return (
    <div className="flex flex-col gap-5">
      <DemoButton />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou entre com email</span>
        <Separator className="flex-1" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            className="mt-1.5"
            required
          />
          {state.status === "error" && (
            <FieldError messages={state.fieldErrors?.email} />
          )}
        </div>
        <div>
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1.5"
            required
          />
          {state.status === "error" && (
            <FieldError messages={state.fieldErrors?.password} />
          )}
        </div>

        {state.status === "error" && !state.fieldErrors && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <Button type="submit" disabled={isPending} className="mt-1">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </div>
  );
}

function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="signup-name">Nome</Label>
        <Input
          id="signup-name"
          name="name"
          autoComplete="name"
          placeholder="O seu nome"
          className="mt-1.5"
          required
        />
        {state.status === "error" && <FieldError messages={state.fieldErrors?.name} />}
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          className="mt-1.5"
          required
        />
        {state.status === "error" && <FieldError messages={state.fieldErrors?.email} />}
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="mt-1.5"
          required
        />
        {state.status === "error" && (
          <FieldError messages={state.fieldErrors?.password} />
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Criar conta
      </Button>
    </form>
  );
}

function DemoButton({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState(
    demoSignIn,
    initialState,
  );

  return (
    <form action={formAction} className={cn("flex flex-col gap-1.5", className)}>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Explorar demo sem conta
      </Button>
      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.message}</p>
      )}
    </form>
  );
}
