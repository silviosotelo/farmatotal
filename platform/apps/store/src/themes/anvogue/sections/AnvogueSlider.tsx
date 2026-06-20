"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css/bundle";
import { IMG, bgLinear, container, textSubDisplay, textDisplay, buttonMain } from "./anvogueClasses";

type Slide = { sub: string; title: string; href: string; img: string; imgClass: string };

const SLIDES: Slide[] = [
  {
    sub: "¡Hasta 50% off!",
    title: "Ofertas de temporada",
    href: "/categorias/ofertas/",
    img: `${IMG}/banner/bg-flash-sale-organic.png`,
    imgClass: "",
  },
  {
    sub: "Nuevos ingresos",
    title: "Todo para tu bienestar",
    href: "/productos",
    img: `${IMG}/banner/bg-buy-pack-organic.png`,
    imgClass: "",
  },
  {
    sub: "Envío a todo el país",
    title: "Tu tienda online",
    href: "/productos",
    img: `${IMG}/banner/video-cos3.png`,
    imgClass: "",
  },
];

export function AnvogueSlider() {
  return (
    <div
      className="slider-block style-one xl:h-[860px] lg:h-[800px] md:h-[580px] sm:h-[500px] h-[350px] max-[420px]:h-[320px] w-full"
      style={{ background: bgLinear }}
    >
      <div className="slider-main h-full w-full">
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          loop
          pagination={{ clickable: true }}
          modules={[Pagination, Autoplay]}
          className="h-full relative"
          autoplay={{ delay: 4000 }}
        >
          {SLIDES.map((s, i) => (
            <SwiperSlide key={i}>
              <div className="slider-item h-full w-full relative">
                <div className={`${container} h-full flex items-center relative`}>
                  <div className="text-content basis-1/2 relative z-[1]">
                    <div className={textSubDisplay}>{s.sub}</div>
                    <div className={`${textDisplay} md:mt-5 mt-2`}>{s.title}</div>
                    <Link href={s.href} className={`${buttonMain} md:mt-8 mt-3`}>
                      Comprar ahora
                    </Link>
                  </div>
                  <div className="absolute right-0 top-0 hidden h-full w-1/2 md:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.img} alt="" className="h-full w-full rounded-l-[28px] object-cover" />
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
