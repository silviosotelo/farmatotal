"use client";

import Image from "next/image";
import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import type { Category } from "@/types";

export function CategoryCircles({
  categories,
  title,
  limit,
}: { categories?: Category[]; title?: string; limit?: number } = {}) {
  const all = categories ?? [];
  const items = typeof limit === "number" && limit > 0 ? all.slice(0, limit) : all;
  if (items.length === 0) return null;
  return (
    <div className="ft-container mt-6">
      {title && <h2 className="mb-4 font-heading text-2xl font-bold text-brand-text">{title}</h2>}
      <div className="rounded-[10px] border border-[#ededf1] bg-white py-6 px-4">
        <Carousel
          showArrows
          showDots={false}
          options={{ loop: true }}
          slideClassName="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
        >
          {items.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="flex flex-col items-center gap-2 pb-[15px] group"
            >
              {cat.icon ? (
                <Image
                  src={cat.icon}
                  alt={cat.name}
                  width={64}
                  height={64}
                  unoptimized
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-xl font-semibold text-brand-orange transition-transform duration-300 group-hover:scale-110"
                >
                  {cat.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm text-[#202435] text-center group-hover:text-brand-orange">
                {cat.name}
              </span>
            </Link>
          ))}
        </Carousel>
      </div>
    </div>
  );
}
