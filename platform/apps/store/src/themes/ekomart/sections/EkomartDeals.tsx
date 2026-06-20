"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css/bundle";
import type { Product } from "@/types";
import { EkomartProductCard } from "../EkomartProductCard";

const GREEN = "#629d23";

function secsToEndOfDay(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Bloque "Deals" (ofertas con cuenta regresiva) en lenguaje visual Ekomart:
 * sección rts-section-gap con título + countdown verde + carrusel de
 * EkomartProductCard. Reemplaza al SuperRombo de Farmatotal cuando el tema
 * activo es Ekomart.
 */
export function EkomartDeals({ products }: { products: Product[] }) {
  const [seconds, setSeconds] = useState<number | null>(null);

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
    { v: hours, l: "Hs." },
    { v: minutes, l: "Min." },
    { v: secs, l: "Seg." },
  ];

  return (
    <div className="weekly-best-selling-area rts-section-gap bg_light-1">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="title-area-between" style={{ flexWrap: "wrap", gap: 16 }}>
              <h2 className="title-left">Ofertas del día</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {units.map((u) => (
                  <div
                    key={u.l}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                  >
                    <span
                      style={{
                        display: "flex",
                        height: 52,
                        width: 50,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 10,
                        background: GREEN,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 24,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {seconds === null ? "--" : pad(u.v)}
                    </span>
                    <span style={{ marginTop: 6, fontSize: 12, color: "#7a7a7a" }}>{u.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-12">
            <Swiper
              spaceBetween={24}
              slidesPerView={2}
              loop={products.length > 6}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              modules={[Autoplay]}
              breakpoints={{
                576: { slidesPerView: 2, spaceBetween: 16 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                992: { slidesPerView: 4, spaceBetween: 24 },
                1200: { slidesPerView: 6, spaceBetween: 24 },
              }}
            >
              {products.map((p) => (
                <SwiperSlide key={p.id}>
                  <EkomartProductCard product={p} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
}
