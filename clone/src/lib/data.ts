import type { Category, HeroSlide, NavLink, Product, PromoBanner } from "@/types";
import { getDeals, getFeatured } from "./catalog";

/** Format an integer as Guaraníes: 68000 -> "₲ 68.000" */
export function formatGs(value: number): string {
  return "₲ " + value.toLocaleString("es-PY").replace(/,/g, ".");
}

export const TOP_NAV: NavLink[] = [
  { label: "Sucursales", href: "/sucursales/" },
  { label: "Trabaja con Nosotros", href: "#" },
  { label: "¿Donde está mi pedido?", href: "/rastrear-pedido/" },
];

export const LANGUAGES = ["English", "Spanish", "German"];
export const CURRENCIES = ["USD", "INR", "GBP"];

/** Full mega-menu category list (TODAS LAS CATEGORÍAS) */
export const MENU_CATEGORIES: NavLink[] = [
  { label: "Bazar y Hogar", href: "/categorias/bazar-y-hogar/" },
  { label: "Belleza", href: "/categorias/belleza/" },
  { label: "Fragancias", href: "/categorias/fragancias/" },
  { label: "Higiene Personal", href: "/categorias/higiene-personal/" },
  { label: "Infantiles", href: "/categorias/infantiles/" },
  { label: "Mamás y Bebés", href: "/categorias/mamas-y-bebes/" },
  { label: "Medicamentos", href: "/categorias/medicamentos/" },
  { label: "Nutrición y Deporte", href: "/categorias/nutricion-y-deporte/" },
  { label: "Ofertas", href: "/categorias/ofertas/" },
];

/** The 6 category circles on the homepage */
export const CATEGORY_CIRCLES: Category[] = [
  { slug: "belleza", name: "Belleza", icon: "/categories/belleza.svg", href: "/categorias/belleza/" },
  { slug: "fragancias", name: "Fragancias", icon: "/categories/fragancias.svg", href: "/categorias/fragancias/" },
  { slug: "higiene-personal", name: "Higiene Personal", icon: "/categories/higiene-personal.svg", href: "/categorias/higiene-personal/" },
  { slug: "mamas-y-bebes", name: "Mamás y Bebés", icon: "/categories/mamas-y-bebes.svg", href: "/categorias/mamas-y-bebes/" },
  { slug: "medicamentos", name: "Medicamentos", icon: "/categories/medicamentos.svg", href: "/categorias/medicamentos/" },
  { slug: "nutricion-y-deporte", name: "Nutrición y Deporte", icon: "/categories/nutricion-y-deporte.svg", href: "/categorias/nutricion-y-deporte/" },
];

export const HERO_SLIDES: HeroSlide[] = [
  { id: "pedidos-ya", image: "/slider/pedidos-ya.png", alt: "Pedidos Ya", href: "#" },
  { id: "fpj", image: "/slider/banner-fpj.png", alt: "¡Hoy Lunes! 30% DTO con Farmatotal Pi Financiera", href: "#" },
  { id: "familiar", image: "/slider/banner-familiar.png", alt: "Plan Familiar", href: "#" },
  { id: "todos-los-dias", image: "/slider/banner-todos-los-dias.png", alt: "Ofertas todos los días", href: "#" },
];

export const PROMO_TODOS_LOS_DIAS: PromoBanner = {
  image: "/banners/todos-los-dias-70.png",
  href: "/catalogo/?descuento=70",
  alt: "Todos los días descuentos hasta un 70%",
};

export const PROMO_SUPER_ROMBO: PromoBanner = {
  image: "/banners/super-rombo-50.png",
  href: "/catalogo/?descuento=50",
  alt: "Súper Rombo hasta 50% de descuento",
};

/** Home product rails — derived from the catalog so every link resolves. */
export const SUPER_ROMBO_PRODUCTS: Product[] = getDeals(8);
export const SELECCION_PRODUCTS: Product[] = getFeatured(8);
