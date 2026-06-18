"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css/bundle";
import { container, heading3, heading5 } from "./anvogueClasses";

export type CollectionItem = { name: string; href: string; image: string };

export function AnvogueCollections({ title, items }: { title: string; items: CollectionItem[] }) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  if (!items.length) return null;

  return (
    <div className="collection-block md:pt-20 pt-10">
      <div className={container}>
        <div className={`${heading3} text-center`}>{title}</div>
      </div>
      <div className="list-collection relative md:mt-10 mt-6 sm:px-5 px-4">
        <Swiper
          spaceBetween={12}
          slidesPerView={2}
          loop
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
            1200: { slidesPerView: 4, spaceBetween: 20 },
          }}
          className="h-full"
        >
          {items.map((c) => (
            <SwiperSlide key={c.href}>
              <Link
                href={c.href}
                className="collection-item group block relative rounded-2xl overflow-hidden cursor-pointer"
              >
                <div className="bg-img aspect-[5/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image}
                    alt={c.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div
                  className={`collection-name ${heading5} text-center absolute left-1/2 -translate-x-1/2 sm:bottom-8 bottom-4 lg:w-[200px] md:w-[160px] w-[110px] md:py-3 py-1.5 bg-white rounded-xl duration-500 group-hover:bg-[#1F1F1F] group-hover:text-white`}
                >
                  {c.name}
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <button
          ref={prevRef}
          aria-label="Anterior"
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          ref={nextRef}
          aria-label="Siguiente"
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-md transition-colors hover:bg-[#1F1F1F] hover:text-white"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
