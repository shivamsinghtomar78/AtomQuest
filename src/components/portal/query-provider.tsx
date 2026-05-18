"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { ReactNode, useState } from "react";
import { getFirebaseClient } from "@/lib/firebase/client";

function handleSessionExpired(error: unknown) {
  if (!(error instanceof Error) || !/401|unauth|session/i.test(error.message)) return;

  const path = `${window.location.pathname}${window.location.search}`;
  signOut(getFirebaseClient().auth).catch(() => undefined);
  fetch("/api/auth/session", { method: "DELETE" }).finally(() => {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(path)}&reason=session_expired`;
  });
}

export function PortalQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleSessionExpired,
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
