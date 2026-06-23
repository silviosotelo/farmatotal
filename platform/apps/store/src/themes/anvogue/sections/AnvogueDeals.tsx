"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@platform/ui";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css/bundle";
import type { Product } from "@/types";
import { AnvogueProductCard } from "../AnvogueProductCard";
import { container, heading2, bgLinear } from "./anvogueClasses";

function secsToEndOfDay(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Bloque "Deals" (ofertas con cuenta regresiva) en lenguaje visual Anvogue:
 * banda flash-sale con gradiente crema + countdown + carrusel de
 * AnvogueProductCard. Reemplaza al SuperRombo de Farmatotal cuando el tema
 * activo es Anvogue.
 */
export function AnvogueDeals({ products }: { products: Product[] }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const prevRef = useRef<HTMLButtonElement>(null!);
  const nextRef = useRef<HTMLButtonElement>(null!);

  useEffect(() => {
    setSeconds(secsToEndOfDay());
    const id = setInterval(() => {
      setSeconds((p) => (p === null || p <= 1 ? secsToEndOfDay() : p - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!products.length) return null;

  const s = seconds ?? 0;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const units = [
    { v: hours, l: "Hours" },
    { v: minutes, l: "Minutes" },
    { v: secs, l: "Seconds" },
  ];

  return (
    <div className="deals-block md:pt-20 pt-10">
      <div className={container}>
        <div
          className="flash-sale-band relative overflow-hidden rounded-[20px] px-6 py-8 md:px-12 md:py-10"
          style={{ background: bgLinear }}
        >
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <div className="text-content">
              <div className={`${heading2} text-[#1F1F1F]`}>Flash Sale!</div>
              <div className="body1 mt-2 text-[16px] leading-[26px] text-[#696C70]">
                Ofertas por tiempo limitado — aprovechá antes de que termine.
              </div>
            </div>
            <div className="countdown-time flex items-center gap-4 max-sm:gap-[10px]">
              {units.map((u, i) => (
                <div key={u.l} className="flex items-center gap-4 max-sm:gap-[10px]">
                  <div className="item flex flex-col items-center">
                    <div className="time flex h-[58px] w-[54px] items-center justify-center rounded-[10px] bg-white text-[28px] font-semibold leading-none text-[#1F1F1F] shadow-[0_3px_10px_rgba(0,0,0,0.06)] tabular-nums">
                      {seconds === null ? "--" : pad(u.v)}
                    </div>
                    <div className="mt-1.5 text-[12px] font-medium uppercase tracking-wide text-[#696C70]">
                      {u.l}
                    </div>
                  </div>
                  {i < units.length - 1 && (
                    <span className="text-[24px] font-semibold text-[#1F1F1F]">:</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="list-product relative md:mt-10 mt-6">
          <Swiper
            spaceBetween={12}
            slidesPerView={2}
            loop={products.length > 4}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            modules={[Navigation, Autoplay]}
            onBeforeInit={(swiper) => {
              const nav = swiper.params.navigation;
              if (nav && typeof nav !== "boolean") {
                nav.prevEl = prevRef.current;
                nav.nextEl = nextRef.current;
              }
            }}
            navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
            breakpoints={{
              576: { slidesPerView: 2, spaceBetween: 12 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1200: { slidesPerView: 4, spaceBetween: 30 },
            }}
          >
            {products.map((p) => (
              <SwiperSlide key={p.id}>
                <AnvogueProductCard product={p} />
              </SwiperSlide>
            ))}
          </Swiper>

          <Button
            ref={prevRef}
            type="button"
            variant="plain"
            aria-label="Anterior"
            className="absolute -left-2 top-1/3 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            ref={nextRef}
            type="button"
            variant="plain"
            aria-label="Siguiente"
            className="absolute -right-2 top-1/3 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
