"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getDictionary, type Locale } from "@/lib/i18n";
import { OptionChip } from "./option-chip";
import { StepHeader, StepProgress, StepShell } from "./step-header";

const ALL_QUICK_SIZES = [1, 2, 3, 4, 5, 6];

export function StepPartySize({
  locale,
  maxOnlinePartySize,
  largeGroupPhone,
  onSelect,
}: {
  locale: Locale;
  maxOnlinePartySize: number | null;
  largeGroupPhone: string | null;
  onSelect: (n: number) => void;
}) {
  const dict = getDictionary(locale);
  const quickSizes =
    maxOnlinePartySize != null ? ALL_QUICK_SIZES.filter((n) => n <= maxOnlinePartySize) : ALL_QUICK_SIZES;
  const customFloor = (quickSizes.at(-1) ?? 0) + 1;
  const showCustomOption = maxOnlinePartySize == null || maxOnlinePartySize >= customFloor;

  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState(String(customFloor));
  const [tooLarge, setTooLarge] = useState(false);

  function handleCustomSubmit() {
    const n = Number(custom);
    if (maxOnlinePartySize != null && n > maxOnlinePartySize) {
      setTooLarge(true);
      return;
    }
    onSelect(n);
  }

  return (
    <StepShell>
      <StepProgress current={1} total={5} />
      <StepHeader title={dict.booking.partySize.question} backLabel={dict.common.back} />
      <div className="flex flex-wrap gap-2">
        {quickSizes.map((n) => (
          <OptionChip key={n} onClick={() => onSelect(n)}>
            {n}
          </OptionChip>
        ))}
        {showCustomOption ? (
          <OptionChip selected={showCustom} onClick={() => setShowCustom(true)}>
            {customFloor}+
          </OptionChip>
        ) : null}
      </div>
      {showCustom ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={customFloor}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setTooLarge(false);
              }}
              className="w-24"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              {dict.common.confirm}
            </button>
          </div>
          {tooLarge ? (
            <p className="text-sm text-muted-foreground">
              Para grupos de más de {maxOnlinePartySize} personas, escribinos
              {largeGroupPhone ? (
                <>
                  {" "}
                  al{" "}
                  <a className="underline" href={`tel:${largeGroupPhone}`}>
                    {largeGroupPhone}
                  </a>
                </>
              ) : (
                " directamente"
              )}
              .
            </p>
          ) : null}
        </div>
      ) : null}
    </StepShell>
  );
}
