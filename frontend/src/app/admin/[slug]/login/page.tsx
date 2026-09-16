import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import type { PublicRestaurantInfo } from "@/lib/api/types";
import { LoginForm } from "../_components/login-form";

export default async function AdminLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const info = await apiGet<PublicRestaurantInfo>(`/r/${slug}`);
  if (!info.ok) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Panel</p>
          <h1 className="font-display text-display-sm text-foreground">{info.data.name}</h1>
        </div>
        <LoginForm slug={slug} />
      </div>
    </div>
  );
}
