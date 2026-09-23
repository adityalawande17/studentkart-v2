"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="font-medium text-neutral-500 hover:text-neutral-800"
    >
      Sign out
    </button>
  );
}
