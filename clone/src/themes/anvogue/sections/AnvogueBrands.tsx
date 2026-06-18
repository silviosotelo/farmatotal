"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css/bundle";
import { container, IMG } from "./anvogueClasses";

const BRANDS = [1, 2, 3, 4, 5, 6].map((n) => `${IMG}/brand/${n}.png`);

export function AnvogueBrands() {
  return (
    <div className="brand-block md:py-[60px] py-[32px]">
      <div className={container}>
        <div className="list-brand">
          <Swiper
            spaceBetween={12}
            slidesPerView={2}
            loop
            modules={[Autoplay]}
            autoplay={{ delay: 4000 }}
            breakpoints={{
              500: { slidesPerView: 3, spaceBetween: 16 },
              680: { slidesPerView: 4, spaceBetween: 16 },
              992: { slidesPerView: 5, spaceBetween: 16 },
              1200: { slidesPerView: 6, spaceBetween: 16 },
            }}
          >
            {BRANDS.map((src, i) => (
              <SwiperSlide key={i}>
                <div className="brand-item relative flex items-center justify-center h-[36px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-auto duration-500 relative object-cover opacity-60 transition-opacity hover:opacity-100"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
