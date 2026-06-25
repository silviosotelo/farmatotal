"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@platform/ui";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt, discount }: { images: string[]; alt: string; discount?: number }) {
  const cleaned = images.filter((src) => typeof src === "string" && src.length > 0);
  const list = cleaned.length ? cleaned : ["/products/no-img.webp"];
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] border border-[#ededf1] bg-white p-8">
        {discount && discount > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-[6px] bg-brand-orange px-2 py-0.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(var(--brand-orange-rgb),0.35)]">
            -{discount}%
          </span>
        )}
        <div className="relative h-full w-full">
          <Image src={list[active]} alt={alt} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-contain" priority />
        </div>
      </div>
      {list.length > 1 && (
        <div className="flex gap-2">
          {list.map((img, i) => (
            <Button
              key={i}
              type="button"
              variant={i === active ? "default" : "plain"}
              shape="none"
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition",
                i === active ? "border-brand-orange" : "border-[#ededf1] hover:border-brand-muted",
              )}
            >
              <Image src={img} alt="" fill sizes="64px" className="object-contain" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
