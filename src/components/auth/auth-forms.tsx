"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  authenticateWithCredentials,
  demoSignIn,
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

export function AuthCard() {
  return (
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
