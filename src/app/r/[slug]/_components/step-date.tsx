"use client";

import { DateTime } from "luxon";
import { Input } from "@/components/ui/input";
import { getDictionary, type Locale } from "@/lib/i18n";
import { OptionChip } from "./option-chip";
import { StepHeader, StepProgress, StepShell } from "./step-header";

export function StepDate({
  locale,
  timezone,
  onSelect,
  onBack,
}: {
  locale: Locale;
  timezone: string;
  onSelect: (date: string) => void;
  onBack: () => void;
}) {
  const dict = getDictionary(locale);
  const today = DateTime.now().setZone(timezone).toISODate()!;
  const tomorrow = DateTime.now().setZone(timezone).plus({ days: 1 }).toISODate()!;

  return (
    <StepShell>
      <StepProgress current={2} total={5} />
      <StepHeader title={dict.booking.date.question} onBack={onBack} backLabel={dict.common.back} />
      <div className="flex flex-wrap items-center gap-2">
        <OptionChip onClick={() => onSelect(today)}>{dict.booking.today}</OptionChip>
        <OptionChip onClick={() => onSelect(tomorrow)}>{dict.booking.tomorrow}</OptionChip>
        <Input
          type="date"
          min={today}
          className="w-auto min-h-11"
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
        />
      </div>
    </StepShell>
  );
}
