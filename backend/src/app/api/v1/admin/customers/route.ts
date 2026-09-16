import { and, eq, or, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { customer, customerRestaurant } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { customerSearchQuerySchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = customerSearchQuerySchema.safeParse({ search: url.searchParams.get("search") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const conditions = [eq(customerRestaurant.restaurantId, auth.session.restaurantId)];
  if (parsed.data.search) {
    const term = `%${parsed.data.search}%`;
    conditions.push(or(ilike(customer.name, term), ilike(customer.phone, term), ilike(customer.email, term))!);
  }

  const rows = await db
    .select({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      noShowCount: customerRestaurant.noShowCount,
      visitCount: customerRestaurant.visitCount,
    })
    .from(customerRestaurant)
    .innerJoin(customer, eq(customer.id, customerRestaurant.customerId))
    .where(and(...conditions))
    .orderBy(customer.name);

  return NextResponse.json({ customers: rows });
}
