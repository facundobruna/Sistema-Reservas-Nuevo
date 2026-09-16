import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import type { PanelAccessResponse } from "@/lib/api/types";
import { requireStaffPage } from "@/lib/auth/require-staff";
import { BillingContent } from "./_components/billing-content";

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireStaffPage(slug);

  const panel = await apiGet<PanelAccessResponse>("/admin/panel-access");
  if (!panel.ok) notFound();

  const { restaurant, subscription, access } = panel.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <BillingContent slug={slug} restaurantName={restaurant.name} subscription={subscription} access={access} />
    </div>
  );
}
