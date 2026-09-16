"use client";

import { getDictionary, type Locale } from "@/lib/i18n";
import { OptionChip } from "./option-chip";
import { StepHeader, StepProgress, StepShell } from "./step-header";

type Zone = { id: string; name: string };

export function StepZone({
  locale,
  zones,
  onSelect,
  onBack,
}: {
  locale: Locale;
  zones: Zone[];
  onSelect: (zoneId: string) => void;
  onBack: () => void;
}) {
  const dict = getDictionary(locale);

  return (
    <StepShell>
      <StepProgress current={4} total={5} />
      <StepHeader title={dict.booking.zone.question} onBack={onBack} backLabel={dict.common.back} />
      <div className="flex flex-wrap gap-2">
        {zones.map((zone) => (
          <OptionChip key={zone.id} onClick={() => onSelect(zone.id)}>
            {zone.name}
          </OptionChip>
        ))}
      </div>
    </StepShell>
  );
}
