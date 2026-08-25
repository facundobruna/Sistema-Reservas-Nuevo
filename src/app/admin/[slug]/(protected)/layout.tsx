import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/auth/require-staff";
import { getRestaurantBySlug } from "@/db/restaurant";
import { db } from "@/db/client";
import { evaluatePanelAccess, getSubscriptionByRestaurantId } from "@/db/subscription";
import { AdminNav } from "../_components/admin-nav";
import { ImpersonationBanner } from "../_components/impersonation-banner";
import { LogoutButton } from "../_components/logout-button";

export default async function AdminProtectedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireStaffPage(slug);
  const restaurant = await getRestaurantBySlug(slug);

  // El bloqueo es exclusivo de este layout (todo el panel del staff). El flujo
  // del comensal (/r/{slug} y sus APIs) nunca pasa por acá — no tiene ningún
  // chequeo de suscripción, en ningún código path.
  if (restaurant) {
    const subscription = await getSubscriptionByRestaurantId(db, restaurant.id);
    const access = evaluatePanelAccess({ suspendedAt: restaurant.suspendedAt, subscription });
    if (access !== "ok") {
      redirect(`/admin/${slug}/billing`);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <div className="mb-6 px-1">
          <p className="font-display text-base text-foreground">{restaurant?.name ?? slug}</p>
          <p className="text-xs text-muted-foreground">Panel del restaurante</p>
        </div>
        <AdminNav slug={slug} />
        <div className="mt-auto space-y-1 border-t border-border pt-3 px-1">
          <p className="truncate text-xs text-muted-foreground">{session.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{session.role}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {session.impersonatedBy ? <ImpersonationBanner slug={slug} /> : null}
        <header className="flex items-center justify-between border-b border-border px-6 py-3 md:hidden">
          <p className="font-display text-base text-foreground">{restaurant?.name ?? slug}</p>
        </header>
        <div className="hidden justify-end border-b border-border px-6 py-3 md:flex">
          <LogoutButton slug={slug} />
        </div>
        <main className="flex-1 px-6 py-8 md:px-10">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
