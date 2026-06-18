"use client";

import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRightIcon } from "@/components/icons";
import type { Product } from "@/types";

export default function SeleccionParaVos({
  products,
  title = "Nuestra selección para vos",
}: { products?: Product[]; title?: string } = {}) {
  if (!products || products.length === 0) return null;
  return (
    <section className="ft-container mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-heading font-bold text-2xl"
          style={{ color: "#7a7a7a" }}
        >
          {title}
        </h2>
        <Link
          href="/catalogo"
          className="focus-ring flex items-center gap-1 rounded-sm text-brand-orange-ink font-medium underline-offset-2 hover:underline"
        >
          Ver todos
          <ArrowRightIcon width={16} height={16} aria-hidden="true" />
        </Link>
      </div>
      <Carousel
        showArrows
        showDots
        options={{ loop: true }}
        slideClassName="basis-1/2 md:basis-1/3 lg:basis-1/4 px-2"
      >
        {(products ?? []).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </Carousel>
    </section>
  );
}
