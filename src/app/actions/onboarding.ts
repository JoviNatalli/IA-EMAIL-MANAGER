"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { focusAreaEnum, userPreferences } from "@/lib/db/schema";

const onboardingSchema = z.object({
  focusAreas: z.array(z.enum(focusAreaEnum.enumValues)).min(1, {
    error: "Escolha pelo menos uma área.",
  }),
  aiAssistanceLevel: z.enum(["minimal", "balanced", "proactive"]),
  autoCategorization: z.boolean(),
  priorityDetection: z.boolean(),
  dailyBriefing: z.boolean(),
  smartReplySuggestions: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(input: OnboardingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = onboardingSchema.parse(input);

  await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      ...parsed,
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...parsed, onboardingCompletedAt: new Date(), updatedAt: new Date() },
    });

  redirect("/app/inbox");
}
