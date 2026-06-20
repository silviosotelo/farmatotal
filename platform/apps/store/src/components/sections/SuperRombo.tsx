"use client";

import { useEffect, useState } from "react";
import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types";

function getSecondsUntilEndOfDay(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 0);
  return Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function SuperRombo({ products }: { products?: Product[] } = {}) {
  // null on first render (server + client match) → avoids hydration mismatch;
  // the real countdown starts after mount.
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    setSeconds(getSecondsUntilEndOfDay());
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev === null || prev <= 1) return getSecondsUntilEndOfDay();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor((seconds ?? 0) / 3600);
  const minutes = Math.floor(((seconds ?? 0) % 3600) / 60);
  const secs = (seconds ?? 0) % 60;

  if (!products || products.length === 0) return null;

  return (
    <div className="ft-container mt-6">
      <div className="card-shadow flex flex-col lg:flex-row overflow-hidden rounded-[12px] border border-[#ededf1] bg-white">
        {/* Left panel */}
        <div className="lg:w-[300px] shrink-0 bg-gradient-to-b from-[#fff6ef] to-white p-6 lg:border-r lg:border-[#ededf1]">
          <h2 className="font-heading font-bold text-brand-orange text-[32px] leading-tight">
            ¡Super Rombo!
          </h2>
          <p className="font-heading font-bold text-[#7a7a7a] text-[20px] leading-tight mt-1">
            ¡Descuentos increíbles!
          </p>
          <p className="text-[#202435] text-[13px] mt-3 leading-snug">
            ¡Estás a tiempo!
            <br />
            Todavía quedan
          </p>

          {/* Countdown */}
          <div className="flex gap-2.5 mt-4">
            {[
              { value: hours, label: "Hs." },
              { value: minutes, label: "Min." },
              { value: secs, label: "Seg." },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span
                  className="flex h-[58px] w-[54px] items-center justify-center rounded-[10px] border border-[#ffe0cc] bg-white font-heading text-[34px] font-bold leading-none text-brand-orange shadow-[0_3px_10px_rgba(241,101,34,0.12)] tabular-nums"
                  aria-hidden="true"
                >
                  {seconds === null ? "--" : pad(value)}
                </span>
                <span className="text-brand-muted text-xs mt-1.5">{label}</span>
              </div>
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Quedan {pad(hours)} horas, {pad(minutes)} minutos y {pad(secs)} segundos
          </span>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-4">
          <Carousel
            autoplayDelay={5000}
            showArrows
            showDots
            options={{ loop: true }}
            slideClassName="basis-1/2 lg:basis-1/3 px-2"
          >
            {(products ?? []).map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </Carousel>
        </div>
      </div>
    </div>
  );
}
