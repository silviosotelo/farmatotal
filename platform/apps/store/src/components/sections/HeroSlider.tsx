"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Carousel } from "@/components/ui/Carousel";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Slide = {
  id: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  linkHref: string | null;
  title: string;
};

/**
 * Slider del home — CMS-driven. El contenido vive en la DB (tabla slides) y se
 * edita en el admin → "Banners del Home". Filtra por día y dispositivo igual
 * que el WordPress original (endpoint /slides/today). Mismo diseño/Carousel.
 */
export function HeroSlider({
  autoplayDelay = 4000,
  showArrows = true,
  showDots = true,
  loop = true,
  fade = true,
}: {
  autoplayDelay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  fade?: boolean;
} = {}) {
  const [items, setItems] = useState<Slide[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    fetch(`${API}/slides/today`)
      .then((r) => r.json())
      .then((d) => setItems(d.data || []))
      .catch(() => setItems([]));
  }, []);

  const visible = items.filter((s) =>
    isMobile ? s.imageMobile || s.imageDesktop : s.imageDesktop || s.imageMobile,
  );
  if (visible.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden">
      <Carousel
        fade={fade}
        autoplayDelay={autoplayDelay}
        showArrows={showArrows}
        showDots={showDots}
        options={{ loop }}
        slideClassName="basis-full"
        arrowClassName="size-11"
      >
        {visible.map((slide, i) => {
          const img = isMobile
            ? slide.imageMobile || slide.imageDesktop
            : slide.imageDesktop || slide.imageMobile;
          return (
            <a key={slide.id} href={slide.linkHref || "#"} className="block w-full">
              <Image
                src={img || ""}
                alt={slide.title}
                width={2438}
                height={1042}
                className="w-full h-auto"
                sizes="100vw"
                priority={i === 0}
                unoptimized
              />
            </a>
          );
        })}
      </Carousel>
    </div>
  );
}
