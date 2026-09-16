import { NextResponse } from "next/server";
import { createDinerSession } from "@/lib/auth/diner-session";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = token ? verifyMagicLinkToken(token) : null;

  if (!payload) {
    return NextResponse.redirect(new URL("/me?error=invalid_link", request.url));
  }

  await createDinerSession(payload.customerId);
  return NextResponse.redirect(new URL("/me", request.url));
}
