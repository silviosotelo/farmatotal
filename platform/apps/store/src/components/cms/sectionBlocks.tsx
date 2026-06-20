"use client";

import { useEffect, useState } from "react";
import { CategoryCircles } from "@/components/sections/CategoryCircles";
import { SuperRombo } from "@/components/sections/SuperRombo";
import SeleccionParaVos from "@/components/sections/SeleccionParaVos";
import { PromoBanner } from "@/components/sections/PromoBanner";
import { EkomartDeals } from "@/themes/ekomart/sections/EkomartDeals";
import { AnvogueDeals } from "@/themes/anvogue/sections/AnvogueDeals";
import type { ThemeKey } from "@/themes/registry";
import type { Category, Product, PromoBanner as PromoBannerType } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function discount(normal: number, web: number) {
  if (normal <= 0 || web >= normal) return 0;
  return Math.round(((normal - web) / normal) * 100);
}
function adapt(p: Record<string, unknown>): Product {
  const imgs = p.images as { url: string; isPrimary?: boolean }[] | undefined;
  const primary = imgs?.find((i) => i.isPrimary)?.url || imgs?.[0]?.url;
  return {
    id: p.id as string,
    slug: p.slug as string,
    title: p.title as string,
    image: primary || "/products/no-img.webp",
    priceNormal: p.priceNormal as number,
    priceWeb: p.priceWeb as number,
    discount: discount(p.priceNormal as number, p.priceWeb as number),
    sku: p.sku as string,
    stock: p.stockCached as number,
  };
}

/** Bloque: círculos de categorías (lee setting home_categories). */
export function HomeCategoriesBlock({ title, limit }: { title?: string; limit?: number } = {}) {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    fetch(`${API}/cms/settings/home_categories`)
      .then((r) => r.json())
      .then((d) => setCats((d?.value as Category[]) || []))
      .catch(() => setCats([]));
  }, []);
  if (cats.length === 0) return null;
  return <CategoryCircles categories={cats} title={title} limit={limit} />;
}

/** Bloque: ofertas del día (productos onPromo). Theme-aware: Ekomart/Anvogue
 * usan su propia sección de deals; Farmatotal usa el SuperRombo. */
export function HomeDealsBlock({
  limit = 12,
  theme = "farmatotal",
}: {
  limit?: number;
  theme?: ThemeKey;
}) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    fetch(`${API}/catalog/products?onPromo=true&status=published&perPage=${limit}`)
      .then((r) => r.json())
      .then((d) => setItems(((d.data as Record<string, unknown>[]) || []).map(adapt)))
      .catch(() => setItems([]));
  }, [limit]);
  if (items.length === 0) return null;
  if (theme === "ekomart") return <EkomartDeals products={items} />;
  if (theme === "anvogue") return <AnvogueDeals products={items} />;
  return <SuperRombo products={items} />;
}

/** Bloque: selección destacada (featured). */
export function HomeFeaturedBlock({ limit = 8, title }: { limit?: number; title?: string }) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    fetch(`${API}/catalog/products?featured=true&status=published&perPage=${limit}`)
      .then((r) => r.json())
      .then((d) => setItems(((d.data as Record<string, unknown>[]) || []).map(adapt)))
      .catch(() => setItems([]));
  }, [limit]);
  if (items.length === 0) return null;
  return <SeleccionParaVos products={items} title={title} />;
}

/** Bloque: banner promocional (lee setting promo_banners[index]). */
export function HomePromoBannerBlock({ index = 0 }: { index?: number }) {
  const [banner, setBanner] = useState<PromoBannerType | null>(null);
  useEffect(() => {
    fetch(`${API}/cms/settings/promo_banners`)
      .then((r) => r.json())
      .then((d) => setBanner(((d?.value as PromoBannerType[]) || [])[index] || null))
      .catch(() => setBanner(null));
  }, [index]);
  if (!banner) return null;
  return <PromoBanner banner={banner} />;
}
