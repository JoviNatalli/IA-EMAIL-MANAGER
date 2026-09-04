import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Configuração inicial",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-12">
      <Logo size="lg" className="mb-10" />
      <OnboardingFlow />
    </div>
  );
}
