// components/admin/QueryProvider.tsx
// TanStack Query provider for the ADMIN dashboard only. Server state (data fetched
// from /api/admin/*) lives here — caching, background refetch, loading/error and
// mutations-with-invalidation — instead of hand-rolled fetch + useState + useEffect.
// The PUBLIC site deliberately does NOT use this: it fetches in server components
// (RSC), which is the better pattern there.
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Admin data is fine slightly stale; refetch on demand / interval.
                        staleTime: 30_000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            }),
    );
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
