import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { evaluatePanelAccess, getSubscriptionByRestaurantId } from "@/db/subscription";
import { requireStaffPage } from "@/lib/auth/require-staff";
import { BillingContent } from "./_components/billing-content";

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireStaffPage(slug);

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const subscription = await getSubscriptionByRestaurantId(db, restaurant.id);
  const access = evaluatePanelAccess({ suspendedAt: restaurant.suspendedAt, subscription });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <BillingContent slug={slug} restaurantName={restaurant.name} subscription={subscription} access={access} />
    </div>
  );
}
