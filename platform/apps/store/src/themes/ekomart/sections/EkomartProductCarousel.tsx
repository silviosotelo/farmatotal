"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Product } from "@/types";
import { EkomartProductCard } from "../EkomartProductCard";

import "swiper/css";
import "swiper/css/navigation";

/**
 * Carrusel de productos (markup "rts-grocery-feature-area" del Featured Grocery).
 * Cada slide envuelve nuestra EkomartProductCard.
 */
export default function EkomartProductCarousel({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  if (!products.length) return null;

  return (
    <div className="rts-grocery-feature-area rts-section-gapBottom">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="title-area-between">
              <h2 className="title-left">{title}</h2>
              <div className="next-prev-swiper-wrapper">
                <div className="swiper-button-prev">
                  <i className="fa-regular fa-chevron-left" />
                </div>
                <div className="swiper-button-next">
                  <i className="fa-regular fa-chevron-right" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="category-area-main-wrapper-one">
              <Swiper
                modules={[Navigation, Autoplay]}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                loop={products.length > 6}
                navigation={{
                  nextEl: ".swiper-button-next",
                  prevEl: ".swiper-button-prev",
                }}
                className="mySwiper-category-1"
                breakpoints={{
                  0: { slidesPerView: 1, spaceBetween: 30 },
                  320: { slidesPerView: 2, spaceBetween: 30 },
                  480: { slidesPerView: 3, spaceBetween: 30 },
                  640: { slidesPerView: 3, spaceBetween: 30 },
                  840: { slidesPerView: 4, spaceBetween: 30 },
                  1140: { slidesPerView: 6, spaceBetween: 30 },
                }}
              >
                {products.map((product) => (
                  <SwiperSlide key={product.id}>
                    <EkomartProductCard product={product} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
