import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">StudentKart</h1>
      <p className="max-w-md text-neutral-600">
        A campus-local marketplace for students — furniture, appliances,
        textbooks, and everything else that piles up before graduation.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Sign up
        </Link>
        <Link href="/login" className="rounded border px-4 py-2">
          Log in
        </Link>
      </div>
    </main>
  );
}
