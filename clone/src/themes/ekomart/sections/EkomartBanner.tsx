"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import Link from "next/link";
import type { Category } from "@/types";

import "swiper/css";
import "swiper/css/navigation";

const IMG = "/themes/ekomart/assets/images";

const SLIDES = [
  {
    bg: `${IMG}/banner/01.webp`,
    pre: "Comprá online de forma fácil y segura",
    title: (
      <>
        Todo lo que necesitás, <br />
        en un solo lugar
      </>
    ),
  },
  {
    bg: `${IMG}/banner/08.webp`,
    pre: "Recibí tus productos en la puerta de tu casa",
    title: (
      <>
        No te pierdas nuestras <br />
        ofertas de cada día
      </>
    ),
  },
];

/** Banner hero (Swiper) + carrusel de categorías inferior, cableado a nuestras categorías. */
export default function EkomartBanner({ categories }: { categories: Category[] }) {
  const cats = categories.slice(0, 14);

  return (
    <div className="background-light-gray-color rts-section-gap bg_light-1 pt_sm--20">
      {/* rts banner area start */}
      <div className="rts-banner-area-one mb--30">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="category-area-main-wrapper-one">
                <Swiper
                  modules={[Navigation, Autoplay]}
                  spaceBetween={1}
                  slidesPerView={1}
                  loop={true}
                  speed={2000}
                  autoplay={{ delay: 4000 }}
                  navigation={{
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                  }}
                  breakpoints={{
                    0: { slidesPerView: 1, spaceBetween: 0 },
                    320: { slidesPerView: 1, spaceBetween: 0 },
                    480: { slidesPerView: 1, spaceBetween: 0 },
                    640: { slidesPerView: 1, spaceBetween: 0 },
                    840: { slidesPerView: 1, spaceBetween: 0 },
                    1140: { slidesPerView: 1, spaceBetween: 0 },
                  }}
                >
                  {SLIDES.map((slide, idx) => (
                    <SwiperSlide key={idx}>
                      <div
                        className="banner-bg-image bg_image bg_one-banner ptb--120 ptb_md--80 ptb_sm--60"
                        style={{
                          backgroundImage: `url(${slide.bg})`,
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="banner-one-inner-content">
                          <span className="pre">{slide.pre}</span>
                          <h1 className="title">{slide.title}</h1>
                          <Link
                            href="/productos"
                            className="rts-btn btn-primary radious-sm with-icon"
                          >
                            <div className="btn-text">Comprar ahora</div>
                            <div className="arrow-icon">
                              <i className="fa-light fa-arrow-right"></i>
                            </div>
                            <div className="arrow-icon">
                              <i className="fa-light fa-arrow-right"></i>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                <button className="swiper-button-next">
                  <i className="fa-regular fa-arrow-right"></i>
                </button>
                <button className="swiper-button-prev">
                  <i className="fa-regular fa-arrow-left"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* rts banner area end */}

      {/* category carousel bottom */}
      {cats.length > 0 && (
        <div className="rts-caregory-area-one">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="category-area-main-wrapper-one">
                  <Swiper
                    modules={[Navigation, Autoplay]}
                    spaceBetween={12}
                    slidesPerView={10}
                    loop={cats.length > 10}
                    speed={1000}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    breakpoints={{
                      0: { slidesPerView: 2, spaceBetween: 12 },
                      320: { slidesPerView: 2, spaceBetween: 12 },
                      480: { slidesPerView: 3, spaceBetween: 12 },
                      640: { slidesPerView: 4, spaceBetween: 12 },
                      840: { slidesPerView: 4, spaceBetween: 12 },
                      1140: { slidesPerView: 10, spaceBetween: 12 },
                    }}
                  >
                    {cats.map((cat, idx) => (
                      <SwiperSlide key={cat.slug}>
                        <Link href={cat.href} className="single-category-one">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cat.icon || `${IMG}/category/0${(idx % 9) + 1}.png`}
                            alt={cat.name}
                            width={60}
                            height={60}
                            style={{ objectFit: "contain" }}
                          />
                          <p>{cat.name}</p>
                        </Link>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
