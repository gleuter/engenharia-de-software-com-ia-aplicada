"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GitHubSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    setIsLoading(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={isLoading}
      aria-busy={isLoading}
      className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.3-5.29-1.29-5.29-5.69 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.72 5.39-5.3 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
      </svg>
      {isLoading ? "Redirecionando..." : "Entrar com GitHub"}
    </button>
  );
}
