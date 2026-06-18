"use client";

import { Camera } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css/bundle";
import { container, heading3, IMG } from "./anvogueClasses";

const POSTS = [1, 2, 3, 4, 5].map((n) => `${IMG}/instagram/${n}.png`);

export function AnvogueInstagram({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="instagram-block md:pt-20 pt-10">
      <div className={container}>
        <div className="heading">
          <div className={`${heading3} text-center`}>{title}</div>
          <div className="text-center mt-3 text-[#696C70]">{tag}</div>
        </div>
        <div className="list-instagram md:mt-10 mt-6">
          <Swiper
            spaceBetween={12}
            slidesPerView={2}
            loop
            modules={[Autoplay]}
            autoplay={{ delay: 4000 }}
            breakpoints={{
              500: { slidesPerView: 2, spaceBetween: 16 },
              680: { slidesPerView: 3, spaceBetween: 16 },
              992: { slidesPerView: 4, spaceBetween: 16 },
              1200: { slidesPerView: 5, spaceBetween: 16 },
            }}
          >
            {POSTS.map((src, i) => (
              <SwiperSlide key={i}>
                <div className="item group relative block rounded-[32px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full duration-500 relative transition-transform group-hover:scale-105"
                  />
                  <div className="icon w-12 h-12 bg-white group-hover:bg-[#1F1F1F] duration-500 flex items-center justify-center rounded-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1]">
                    <Camera size={22} className="text-[#1F1F1F] group-hover:text-white duration-500" />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
