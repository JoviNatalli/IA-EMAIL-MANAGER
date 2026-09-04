import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { listThreads } from "@/lib/emails/queries";
import { SearchView } from "@/components/mail/search-view";

export default async function SearchPage({
  searchParams,
}: PageProps<"/app/search">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  const results = query.trim()
    ? await listThreads(session.user.id, { type: "search", query })
    : [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <SearchView query={query} results={results} currentUserEmail={session.user.email ?? ""} />
    </div>
  );
}
