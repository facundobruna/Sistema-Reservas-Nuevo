import { NextResponse } from "next/server";
import { getPublicRestaurantInfo } from "@/db/restaurant";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const info = await getPublicRestaurantInfo(slug);
  if (!info) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: info.restaurant.slug,
    name: info.restaurant.name,
    timezone: info.restaurant.timezone,
    settings: info.restaurant.settings,
    zones: info.zones,
    services: info.services,
  });
}
