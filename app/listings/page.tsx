import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "./sign-out-button";

export default async function ListingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listings</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span>
            Signed in as {session.user.email} ({session.user.role})
          </span>
          <SignOutButton />
        </div>
      </div>
      <div className="rounded border border-dashed p-12 text-center text-neutral-500">
        No listings yet. Phase 1 adds creating and browsing listings.
      </div>
    </main>
  );
}
