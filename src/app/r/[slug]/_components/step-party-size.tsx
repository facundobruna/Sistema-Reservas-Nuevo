"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getDictionary, type Locale } from "@/lib/i18n";
import { OptionChip } from "./option-chip";
import { StepHeader, StepProgress, StepShell } from "./step-header";

const QUICK_SIZES = [1, 2, 3, 4, 5, 6];

export function StepPartySize({ locale, onSelect }: { locale: Locale; onSelect: (n: number) => void }) {
  const dict = getDictionary(locale);
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("7");

  return (
    <StepShell>
      <StepProgress current={1} total={5} />
      <StepHeader title={dict.booking.partySize.question} backLabel={dict.common.back} />
      <div className="flex flex-wrap gap-2">
        {QUICK_SIZES.map((n) => (
          <OptionChip key={n} onClick={() => onSelect(n)}>
            {n}
          </OptionChip>
        ))}
        <OptionChip selected={showCustom} onClick={() => setShowCustom(true)}>
          7+
        </OptionChip>
      </div>
      {showCustom ? (
        <div className="mt-4 flex items-center gap-2">
          <Input
            type="number"
            min={7}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-24"
            autoFocus
          />
          <button
            type="button"
            onClick={() => onSelect(Number(custom))}
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            {dict.common.confirm}
          </button>
        </div>
      ) : null}
    </StepShell>
  );
}
