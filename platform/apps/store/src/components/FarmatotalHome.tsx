import { HeroSlider } from "@/components/sections/HeroSlider";
import { CategoryCircles } from "@/components/sections/CategoryCircles";
import { SuperRombo } from "@/components/sections/SuperRombo";
import SeleccionParaVos from "@/components/sections/SeleccionParaVos";
import { getHomeCategories, getDeals, getFeatured, listProducts } from "@/lib/api";
import type { Product, Category } from "@/types";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/**
 * Home nativo de Farmatotal — system-driven (sin page builder). Todas las secciones
 * consumen datos del backend: el slider lee los slides editables en el admin
 * (/slides/today), y categorías/ofertas/destacados salen del catálogo. Los colores
 * vienen de los tokens de marca (store_config.colors) inyectados en el layout.
 */
export async function FarmatotalHome() {
  const [categories, deals, featured, latest] = await Promise.all([
    safe(getHomeCategories(), [] as Category[]),
    safe(getDeals(12), [] as Product[]),
    safe(getFeatured(12), [] as Product[]),
    safe(listProducts({ perPage: 12 }), { products: [] as Product[], total: 0, page: 1, perPage: 12 }),
  ]);
  const seleccion = featured.length ? featured : latest.products;

  return (
    <main className="flex-1 pb-14">
      <h1 className="sr-only">Tu tienda online</h1>
      <HeroSlider />
      <CategoryCircles categories={categories} title="Categorías" />
      <SuperRombo products={deals} />
      <SeleccionParaVos products={seleccion} />
    </main>
  );
}
