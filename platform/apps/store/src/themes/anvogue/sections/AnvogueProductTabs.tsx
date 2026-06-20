"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css/bundle";
import type { Product } from "@/types";
import { AnvogueProductCard } from "../AnvogueProductCard";
import { container, heading5 } from "./anvogueClasses";

export type ProductTab = { label: string; products: Product[] };

export function AnvogueProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const available = tabs.filter((t) => t.products.length > 0);
  const [active, setActive] = useState(0);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!available.length) return null;
  const current = available[Math.min(active, available.length - 1)];

  return (
    <div className="tab-features-block md:pt-20 pt-10">
      <div className={container}>
        <div className="heading flex flex-col items-center text-center">
          <div className="menu-tab flex items-center gap-2 p-1 bg-[#F7F7F7] rounded-2xl">
            {available.map((t, i) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setActive(i)}
                className={`tab-item relative ${heading5} py-2 px-5 rounded-2xl cursor-pointer duration-500 ${
                  i === active ? "bg-white text-[#1F1F1F]" : "text-[#696C70] hover:text-[#1F1F1F]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="list-product relative md:mt-10 mt-6">
          <Swiper
            key={current.label}
            spaceBetween={12}
            slidesPerView={2}
            loop={current.products.length > 4}
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
            {current.products.map((p) => (
              <SwiperSlide key={p.id}>
                <AnvogueProductCard product={p} />
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            ref={prevRef}
            aria-label="Anterior"
            className="absolute -left-2 top-1/3 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            ref={nextRef}
            aria-label="Siguiente"
            className="absolute -right-2 top-1/3 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
