import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BriefingView } from "@/components/dashboard/briefing-view";
import { collectBriefingData } from "@/lib/ai/briefing";

export default async function BriefingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await collectBriefingData(session.user.id);
  return <BriefingView data={data} />;
}
