"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function signOut() {
    setIsLoading(true);
    await authClient.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isLoading}
      aria-busy={isLoading}
      className="w-full rounded-xl border border-white/15 px-4 py-3 font-semibold transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
    >
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}
