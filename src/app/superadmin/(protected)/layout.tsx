import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperadminPage } from "@/lib/auth/require-superadmin";
import { SuperadminLogoutButton } from "../_components/logout-button";

export default async function SuperadminProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireSuperadminPage();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link href="/superadmin" className="font-display text-base text-foreground">
          Superadmin
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{session.email}</p>
          <SuperadminLogoutButton />
        </div>
      </header>
      <main className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
