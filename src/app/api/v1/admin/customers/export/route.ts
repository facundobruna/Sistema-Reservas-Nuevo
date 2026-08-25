import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { customer, customerRestaurant } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";

function csvEscape(value: string | number | null): string {
  const str = value === null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET() {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const rows = await db
    .select({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      noShowCount: customerRestaurant.noShowCount,
      visitCount: customerRestaurant.visitCount,
    })
    .from(customerRestaurant)
    .innerJoin(customer, eq(customer.id, customerRestaurant.customerId))
    .where(eq(customerRestaurant.restaurantId, auth.session.restaurantId))
    .orderBy(customer.name);

  const header = "nombre,telefono,email,no_shows,visitas";
  const lines = rows.map((r) =>
    [csvEscape(r.name), csvEscape(r.phone), csvEscape(r.email), r.noShowCount, r.visitCount].join(","),
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comensales.csv"',
    },
  });
}
