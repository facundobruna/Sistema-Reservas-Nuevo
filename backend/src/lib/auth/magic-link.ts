import { decodeSignedToken, encodeSignedToken } from "./signed-token";

const MAGIC_LINK_TTL_SECONDS = 60 * 15; // 15 minutos

export type MagicLinkPayload = {
  customerId: string;
  exp: number;
};

export function createMagicLinkToken(customerId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAGIC_LINK_TTL_SECONDS;
  return encodeSignedToken<MagicLinkPayload>({ customerId, exp });
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload | null {
  return decodeSignedToken<MagicLinkPayload>(token);
}
