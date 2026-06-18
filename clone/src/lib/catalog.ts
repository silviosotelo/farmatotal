import type { Product, Category, Coupon, Order, User, Address, Review } from "@/types";

/** Full category list (mega-menu + archives) */
export const CATEGORIES: Category[] = [
  { slug: "bazar-y-hogar", name: "Bazar y Hogar", href: "/categorias/bazar-y-hogar/" },
  { slug: "belleza", name: "Belleza", icon: "/categories/belleza.svg", href: "/categorias/belleza/" },
  { slug: "fragancias", name: "Fragancias", icon: "/categories/fragancias.svg", href: "/categorias/fragancias/" },
  { slug: "higiene-personal", name: "Higiene Personal", icon: "/categories/higiene-personal.svg", href: "/categorias/higiene-personal/" },
  { slug: "infantiles", name: "Infantiles", href: "/categorias/infantiles/" },
  { slug: "mamas-y-bebes", name: "Mamás y Bebés", icon: "/categories/mamas-y-bebes.svg", href: "/categorias/mamas-y-bebes/" },
  { slug: "medicamentos", name: "Medicamentos", icon: "/categories/medicamentos.svg", href: "/categorias/medicamentos/" },
  { slug: "nutricion-y-deporte", name: "Nutrición y Deporte", icon: "/categories/nutricion-y-deporte.svg", href: "/categorias/nutricion-y-deporte/" },
  { slug: "ofertas", name: "Ofertas", href: "/categorias/ofertas/" },
];

export const categoryName = (slug: string): string =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

const NO_IMG = "/products/no-img.webp";

/** Only these products have a real photo asset; everything else uses a neutral
 *  placeholder. Cycling real photos onto unrelated products showed e.g. a jabón
 *  bottle on Paracetamol — misleading, so we map explicitly by slug. */
const IMG_BY_SLUG: Record<string, string> = {
  "hepatalgina-9-hierbas-fco-x-50-ml": "/products/hepatalgina.jpg",
  "evagina-jabon-liquido-fco-x-200-ml": "/products/evagina.jpg",
  "botiquin-de-plastico-grande-sf-782": "/products/botiquin.png",
  "organizador-diseno-tren-sf-310": "/products/organizador-tren.png",
};

// [slug, title, category, priceNormal, priceWeb, brand, stock]
type Raw = [string, string, string, number, number, string, number];

const RAW: Raw[] = [
  // medicamentos
  ["hepatalgina-9-hierbas-fco-x-50-ml", "Hepatalgina 9 Hierbas Fco X 50 Ml", "medicamentos", 68000, 57100, "Hepatalgina", 24],
  ["paracetamol-500-mg-x-10-comp", "Paracetamol 500 Mg X 10 Comprimidos", "medicamentos", 9000, 7200, "Genérico", 120],
  ["ibuprofeno-400-mg-x-10-comp", "Ibuprofeno 400 Mg X 10 Comprimidos", "medicamentos", 15000, 11900, "Genérico", 90],
  ["amoxicilina-500-mg-x-21-caps", "Amoxicilina 500 Mg X 21 Cápsulas", "medicamentos", 42000, 35900, "Genérico", 40],
  ["loratadina-10-mg-x-10-comp", "Loratadina 10 Mg X 10 Comprimidos", "medicamentos", 18000, 14500, "Genérico", 0],
  ["sales-de-rehidratacion-x-1", "Sales de Rehidratación Oral X 1", "medicamentos", 7500, 6300, "Genérico", 200],
  // belleza
  ["base-liquida-matte-30-ml", "Base Líquida Matte Fco X 30 Ml", "belleza", 95000, 79900, "L'Oréal", 30],
  ["labial-mate-larga-duracion", "Labial Mate Larga Duración", "belleza", 55000, 44900, "Maybelline", 60],
  ["mascara-de-pestanas-volumen", "Máscara de Pestañas Volumen", "belleza", 62000, 49900, "Maybelline", 45],
  ["crema-facial-hidratante-50-ml", "Crema Facial Hidratante Fco X 50 Ml", "belleza", 120000, 99900, "Nivea", 25],
  ["esmalte-de-unas-color", "Esmalte de Uñas Color X 1", "belleza", 22000, 17900, "Revlon", 80],
  // fragancias
  ["perfume-floral-edp-100-ml", "Perfume Floral EDP Fco X 100 Ml", "fragancias", 350000, 289900, "Carolina H.", 12],
  ["perfume-amaderado-edt-90-ml", "Perfume Amaderado EDT Fco X 90 Ml", "fragancias", 420000, 359900, "Hugo Boss", 8],
  ["body-splash-frutal-250-ml", "Body Splash Frutal Fco X 250 Ml", "fragancias", 48000, 38900, "Natura", 50],
  ["desodorante-perfume-150-ml", "Desodorante Perfume Fco X 150 Ml", "fragancias", 35000, 28900, "Rexona", 70],
  // higiene-personal
  ["evagina-jabon-liquido-fco-x-200-ml", "Evagina Jabon Liquido Fco X 200 Ml", "higiene-personal", 55900, 47000, "Evagina", 33],
  ["shampoo-anticaspa-400-ml", "Shampoo Anticaspa Fco X 400 Ml", "higiene-personal", 42000, 33900, "Head&Shoulders", 55],
  ["pasta-dental-blanqueadora-90-g", "Pasta Dental Blanqueadora X 90 G", "higiene-personal", 18000, 14900, "Colgate", 140],
  ["jabon-de-tocador-pack-x-3", "Jabón de Tocador Pack X 3", "higiene-personal", 21000, 16900, "Dove", 110],
  ["enjuague-bucal-500-ml", "Enjuague Bucal Fco X 500 Ml", "higiene-personal", 38000, 30900, "Listerine", 0],
  ["cepillo-dental-suave", "Cepillo Dental Suave X 1", "higiene-personal", 12000, 9500, "Oral-B", 200],
  // mamas-y-bebes
  ["panales-talle-g-x-40", "Pañales Talle G X 40 Unidades", "mamas-y-bebes", 98000, 84900, "Pampers", 40],
  ["toallitas-humedas-x-100", "Toallitas Húmedas X 100 Unidades", "mamas-y-bebes", 32000, 25900, "Huggies", 90],
  ["shampoo-bebe-200-ml", "Shampoo para Bebé Fco X 200 Ml", "mamas-y-bebes", 28000, 22900, "Johnson's", 60],
  ["mamadera-anticolicos-260-ml", "Mamadera Anticólicos X 260 Ml", "mamas-y-bebes", 45000, 36900, "Avent", 20],
  // infantiles
  ["porta-lapiz-diseno-dinosaurio-sf-363", "Porta Lapiz Diseño Dinosaurio Sf-363", "infantiles", 45000, 31500, "Sanafer", 15],
  ["set-de-bloques-x-50", "Set de Bloques de Construcción X 50", "infantiles", 89000, 69900, "Genérico", 18],
  ["muneca-articulada", "Muñeca Articulada con Accesorios", "infantiles", 110000, 89900, "Genérico", 10],
  ["rompecabezas-100-piezas", "Rompecabezas 100 Piezas", "infantiles", 35000, 27900, "Genérico", 35],
  // bazar-y-hogar
  ["organizador-diseno-tren-sf-310", "Caja Organizadora Con Diseño De Tren", "bazar-y-hogar", 142700, 99900, "Sanfer", 22],
  ["botiquin-de-plastico-grande-sf-782", "Botiquín de plástico vacío con diseño", "bazar-y-hogar", 99900, 69900, "Sanfer", 14],
  ["set-de-vasos-x-6", "Set de Vasos de Vidrio X 6", "bazar-y-hogar", 65000, 52900, "Genérico", 40],
  ["tabla-de-cortar-bambu", "Tabla de Cortar de Bambú", "bazar-y-hogar", 48000, 38900, "Genérico", 50],
  ["organizador-de-cocina", "Organizador de Cocina Multiuso", "bazar-y-hogar", 75000, 59900, "Genérico", 0],
  // nutricion-y-deporte
  ["proteina-whey-1-kg", "Proteína Whey Pote X 1 Kg", "nutricion-y-deporte", 320000, 269900, "ENA", 16],
  ["creatina-monohidrato-300-g", "Creatina Monohidrato X 300 G", "nutricion-y-deporte", 180000, 149900, "Star Nutrition", 24],
  ["multivitaminico-x-60-caps", "Multivitamínico X 60 Cápsulas", "nutricion-y-deporte", 95000, 76900, "Centrum", 60],
  ["barra-de-proteina-x-1", "Barra de Proteína X 1", "nutricion-y-deporte", 15000, 11900, "ENA", 150],
  ["shaker-600-ml", "Vaso Shaker X 600 Ml", "nutricion-y-deporte", 38000, 29900, "Genérico", 80],
];

function build([slug, title, category, priceNormal, priceWeb, brand, stock]: Raw, i: number): Product {
  const img = IMG_BY_SLUG[slug] ?? NO_IMG;
  return {
    id: String(1000 + i),
    slug,
    title,
    image: img,
    priceNormal,
    priceWeb,
    discount: Math.round((1 - priceWeb / priceNormal) * 100),
    category,
    sku: String(7790000000000 + i * 137),
    stock,
    brand,
    description:
      `${title}. Producto disponible en Farmatotal. Presentación original, controlada y con garantía de calidad. ` +
      `El precio web puede variar respecto al precio de góndola; el stock se confirma por sucursal al momento de la compra.`,
    gallery: [img],
    rating: 3.5 + ((i * 7) % 16) / 10, // 3.5–5.0 deterministic
    reviewCount: 4 + ((i * 13) % 40),
  };
}

export const PRODUCTS: Product[] = RAW.map(build);

/* ── Query helpers ─────────────────────────────────────────────────────── */
export const getAllProducts = (): Product[] => PRODUCTS;
export const getProductBySlug = (slug: string): Product | undefined =>
  PRODUCTS.find((p) => p.slug === slug);
export const getProductsByCategory = (slug: string): Product[] =>
  slug === "ofertas" ? PRODUCTS.filter((p) => p.discount >= 20) : PRODUCTS.filter((p) => p.category === slug);
/** Lowercase + strip diacritics so "jabon" matches "Jabón". */
const norm = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export const searchProducts = (q: string): Product[] => {
  const t = norm(q.trim());
  if (!t) return [];
  return PRODUCTS.filter(
    (p) =>
      norm(p.title).includes(t) ||
      norm(p.brand ?? "").includes(t) ||
      (p.sku ?? "").includes(t) ||
      norm(p.category ?? "").includes(t),
  );
};
export const getRelated = (p: Product, n = 8): Product[] =>
  PRODUCTS.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, n);
export const getDeals = (n = 12): Product[] =>
  [...PRODUCTS].sort((a, b) => b.discount - a.discount).slice(0, n);
export const getFeatured = (n = 12): Product[] => PRODUCTS.slice(0, n);

/* ── Coupons (mock) ────────────────────────────────────────────────────── */
export const COUPONS: Coupon[] = [
  { code: "FARMA10", percent: 10, description: "10% de descuento" },
  { code: "SUPERROMBO", percent: 15, description: "15% Súper Rombo" },
  { code: "BIENVENIDA", percent: 5, description: "5% primera compra" },
];
export const findCoupon = (code: string): Coupon | undefined =>
  COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());

/* ── Mock account data ─────────────────────────────────────────────────── */
export const MOCK_USER: User = {
  id: "u1",
  firstName: "Cliente",
  lastName: "Demo",
  email: "cliente@farmatotal.com.py",
  phone: "0981 123 456",
};

export const MOCK_ADDRESSES: Address[] = [
  { id: "a1", label: "Casa", fullName: "Cliente Demo", phone: "0981 123 456", city: "Asunción", address: "Avda. Mcal. López 1234", isDefault: true },
  { id: "a2", label: "Trabajo", fullName: "Cliente Demo", phone: "0981 123 456", city: "Fernando de la Mora", address: "Acceso Sur 425" },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "FT-10432",
    date: "2026-05-18",
    status: "completado",
    total: 164900,
    sucursal: "De la Victoria",
    paymentMethod: "Tarjeta (Bancard)",
    lines: [
      { title: "Hepatalgina 9 Hierbas Fco X 50 Ml", sku: "7796285290207", quantity: 1, price: 57100, image: "/products/hepatalgina.jpg" },
      { title: "Caja Organizadora Con Diseño De Tren", sku: "6973048313101", quantity: 1, price: 99900, image: "/products/organizador-tren.png" },
    ],
  },
  {
    id: "FT-10455",
    date: "2026-05-22",
    status: "procesando",
    total: 47000,
    sucursal: "Choferes del Chaco",
    paymentMethod: "Efectivo en sucursal",
    lines: [{ title: "Evagina Jabon Liquido Fco X 200 Ml", sku: "7796285289324", quantity: 1, price: 47000, image: "/products/evagina.jpg" }],
  },
];

export const SAMPLE_REVIEWS: Review[] = [
  { author: "María G.", rating: 5, date: "2026-05-10", text: "Excelente producto, llegó rápido y bien embalado." },
  { author: "Jorge R.", rating: 4, date: "2026-05-02", text: "Buena relación precio/calidad. Lo recomiendo." },
  { author: "Lucía B.", rating: 5, date: "2026-04-21", text: "Tal cual la descripción, muy conforme con la compra." },
];
