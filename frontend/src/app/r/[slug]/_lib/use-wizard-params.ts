"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WizardParams = {
  partySize: number | null;
  date: string | null;
  time: string | null;
  zoneId: string | null;
  reservationId: string | null;
};

export type WizardStep = "partySize" | "date" | "time" | "zone" | "contact" | "confirmation";

/**
 * Todo el estado del wizard vive en la URL — nunca en useState — para que
 * atrás, refresh y compartir el link funcionen solos. Cada setter limpia los
 * pasos que dependen del que se está cambiando, para que la URL nunca
 * represente una combinación inconsistente (ej. un horario elegido para otra
 * cantidad de comensales).
 */
export function useWizardParams(hasMultipleZones: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params: WizardParams = useMemo(
    () => ({
      partySize: searchParams.get("partySize") ? Number(searchParams.get("partySize")) : null,
      date: searchParams.get("date"),
      time: searchParams.get("time"),
      zoneId: searchParams.get("zoneId"),
      reservationId: searchParams.get("reservationId"),
    }),
    [searchParams],
  );

  const navigate = useCallback(
    (next: Partial<Record<keyof WizardParams, string | null>>) => {
      const query = new URLSearchParams(searchParams.toString());
      for (const key of ["partySize", "date", "time", "zoneId", "reservationId"] as const) {
        const value = next[key];
        if (value === undefined) continue;
        if (value === null) query.delete(key);
        else query.set(key, value);
      }
      router.push(`${pathname}?${query.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const setPartySize = useCallback(
    (partySize: number) =>
      navigate({ partySize: String(partySize), date: null, time: null, zoneId: null, reservationId: null }),
    [navigate],
  );

  const setDate = useCallback(
    (date: string) => navigate({ date, time: null, zoneId: null, reservationId: null }),
    [navigate],
  );

  const setTime = useCallback(
    (time: string) => navigate({ time, zoneId: null, reservationId: null }),
    [navigate],
  );

  const setZone = useCallback((zoneId: string) => navigate({ zoneId, reservationId: null }), [navigate]);

  const setReservationId = useCallback((reservationId: string) => navigate({ reservationId }), [navigate]);

  const step: WizardStep = useMemo(() => {
    if (params.reservationId) return "confirmation";
    if (!params.partySize) return "partySize";
    if (!params.date) return "date";
    if (!params.time) return "time";
    if (hasMultipleZones && !params.zoneId) return "zone";
    return "contact";
  }, [params, hasMultipleZones]);

  return { params, step, setPartySize, setDate, setTime, setZone, setReservationId, navigate };
}
