// app/admin/layout.tsx
// Wraps the admin dashboard in the TanStack Query provider so admin panels can use
// useQuery / useMutation for their server state. Public pages are unaffected.
import QueryProvider from "@/components/admin/QueryProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <QueryProvider>{children}</QueryProvider>;
}
