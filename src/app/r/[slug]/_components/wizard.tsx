"use client";

import { DateTime } from "luxon";
import { defaultLocale } from "@/lib/i18n";
import { useWizardParams } from "../_lib/use-wizard-params";
import { StepPartySize } from "./step-party-size";
import { StepDate } from "./step-date";
import { StepTime } from "./step-time";
import { StepZone } from "./step-zone";
import { StepContact } from "./step-contact";
import { StepConfirmation } from "./step-confirmation";

type Zone = { id: string; name: string };
type Service = { id: string; name: string };

export function BookingWizard({
  slug,
  timezone,
  zones,
  services,
  maxOnlinePartySize,
  largeGroupPhone,
}: {
  slug: string;
  timezone: string;
  zones: Zone[];
  services: Service[];
  maxOnlinePartySize: number | null;
  largeGroupPhone: string | null;
}) {
  const locale = defaultLocale;
  const hasMultipleZones = zones.length > 1;
  const { params, step, setPartySize, setDate, setTime, setZone, setReservationId, navigate } =
    useWizardParams(hasMultipleZones);

  if (step === "partySize") {
    return (
      <StepPartySize
        locale={locale}
        maxOnlinePartySize={maxOnlinePartySize}
        largeGroupPhone={largeGroupPhone}
        onSelect={setPartySize}
      />
    );
  }

  if (step === "date") {
    return (
      <StepDate
        locale={locale}
        timezone={timezone}
        onSelect={setDate}
        onBack={() => navigate({ partySize: null })}
      />
    );
  }

  if (step === "time") {
    return (
      <StepTime
        locale={locale}
        slug={slug}
        timezone={timezone}
        date={params.date!}
        partySize={params.partySize!}
        services={services}
        onSelect={setTime}
        onBack={() => navigate({ date: null })}
      />
    );
  }

  if (step === "zone") {
    return <StepZone locale={locale} zones={zones} onSelect={setZone} onBack={() => navigate({ time: null })} />;
  }

  if (step === "contact") {
    const timeLabel = params.time ? DateTime.fromISO(params.time).setZone(timezone).toFormat("HH:mm") : "";
    return (
      <StepContact
        locale={locale}
        slug={slug}
        partySize={params.partySize!}
        time={params.time!}
        timeLabel={timeLabel}
        zoneId={params.zoneId}
        onBack={() => navigate(hasMultipleZones ? { zoneId: null } : { time: null })}
        onChangeZone={() => navigate({ zoneId: null })}
        onChangeTime={() => navigate({ time: null, zoneId: null })}
        onSuccess={setReservationId}
      />
    );
  }

  return <StepConfirmation locale={locale} slug={slug} reservationId={params.reservationId!} timezone={timezone} />;
}
