"use client";

import { useState } from "react";
import { Button } from "@platform/ui";

export function QuantityStepper({ min = 1, max = 99 }: { min?: number; max?: number }) {
  const [qty, setQty] = useState(min);
  const dec = () => setQty((q) => Math.max(min, q - 1));
  const inc = () => setQty((q) => Math.min(max, q + 1));

  return (
    <div className="flex h-[44px] items-center overflow-hidden rounded-[8px] border border-[#ededf1]">
      <Button
        type="button"
        variant="plain"
        aria-label="Disminuir cantidad"
        onClick={dec}
        disabled={qty <= min}
        className="flex h-full select-none items-center justify-center px-4 text-base text-brand-muted hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 rounded-none"
      >
        −
      </Button>
      <span
        className="flex h-full min-w-[40px] items-center justify-center border-x border-[#ededf1] px-5 text-sm font-medium text-brand-text tabular-nums"
        aria-live="polite"
      >
        {qty}
      </span>
      <Button
        type="button"
        variant="plain"
        aria-label="Aumentar cantidad"
        onClick={inc}
        disabled={qty >= max}
        className="flex h-full select-none items-center justify-center px-4 text-base text-brand-muted hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 rounded-none"
      >
        +
      </Button>
    </div>
  );
}
