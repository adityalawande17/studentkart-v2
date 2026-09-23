import Link from "next/link";

const FEATURES = [
  { label: "5km radius", desc: "Only see what's actually nearby" },
  { label: "Graduating soon", desc: "Spot move-out sales instantly" },
  { label: "Live chat", desc: "Message sellers in real time" },
];

export default function Home() {
  return (
    <main className="relative flex w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, var(--color-brand-100) 0%, transparent 70%)",
        }}
      />
      <span className="mb-4 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        Built for campus life
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-neutral-900">
        Student<span className="text-brand-600">Kart</span>
      </h1>
      <p className="mt-4 max-w-md text-balance text-neutral-600">
        A campus-local marketplace for students — furniture, appliances,
        textbooks, and everything else that piles up before graduation.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Log in
        </Link>
      </div>

      <div className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white px-4 py-5 shadow-sm"
          >
            <span className="font-medium text-neutral-900">{f.label}</span>
            <span className="text-sm text-neutral-500">{f.desc}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
