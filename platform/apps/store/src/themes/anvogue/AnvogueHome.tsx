import Link from "next/link";
import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Product, Category } from "@/types";
import { getDeals, getFeatured, listProducts, listCategories } from "@/lib/api";
import { AnvogueProductCard } from "./AnvogueProductCard";
import { AnvogueSlider } from "./sections/AnvogueSlider";
import { AnvogueCollections, type CollectionItem } from "./sections/AnvogueCollections";
import { AnvogueProductTabs } from "./sections/AnvogueProductTabs";
import { AnvogueBrands } from "./sections/AnvogueBrands";
import { AnvogueInstagram } from "./sections/AnvogueInstagram";
import {
  C,
  IMG,
  container,
  heading2,
  heading3,
  heading6,
  caption1,
  textButton,
} from "./sections/anvogueClasses";

/** Pool de imágenes reales para las tarjetas de categoría. */
const COLLECTION_IMAGES = [
  `${IMG}/collection/pharmacy.png`,
  `${IMG}/collection/skin.png`,
  `${IMG}/collection/hair.png`,
  `${IMG}/collection/body.png`,
  `${IMG}/collection/supplements.png`,
  `${IMG}/collection/food.png`,
  `${IMG}/collection/accessories-cos.png`,
  `${IMG}/collection/outfit.png`,
];

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const BENEFITS = [
  { icon: Headset, title: "Atención 24/7", sub: "Estamos para ayudarte con cualquier consulta, las 24 horas." },
  { icon: RotateCcw, title: "Devolución 14 días", sub: "Si no quedás conforme, devolvé tu compra en 14 días." },
  { icon: ShieldCheck, title: "Compra segura", sub: "Respaldamos cada producto y garantizamos tu satisfacción." },
  { icon: Truck, title: "Envío a todo el país", sub: "Llevamos tus productos a donde estés." },
] as const;

export async function AnvogueHome() {
  const [featured, deals, latest, categories] = await Promise.all([
    safe(getFeatured(10), [] as Product[]),
    safe(getDeals(10), [] as Product[]),
    safe(listProducts({ perPage: 10 }), { products: [] as Product[], total: 0, page: 1, perPage: 10 }),
    safe(listCategories(), [] as Category[]),
  ]);

  const bestSellers = latest.products;
  const featuredGrid = featured.slice(0, 8);

  const collectionItems: CollectionItem[] = categories.slice(0, 8).map((c, i) => ({
    name: c.name,
    href: c.href,
    image: COLLECTION_IMAGES[i % COLLECTION_IMAGES.length],
  }));

  return (
    <div className="anvogue-home bg-white" style={{ color: C.black }}>
      {/* HERO SLIDER */}
      <AnvogueSlider />

      {/* WHAT'S NEW -> Productos destacados (grid) */}
      {featuredGrid.length > 0 && (
        <div className="whate-new-block md:pt-20 pt-10">
          <div className={container}>
            <div className="heading flex flex-col items-center text-center">
              <div className={heading3}>Productos destacados</div>
            </div>
            <div className="list-product grid lg:grid-cols-4 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
              {featuredGrid.map((p) => (
                <AnvogueProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXPLORE COLLECTIONS -> Categorías */}
      <AnvogueCollections title="Categorías" items={collectionItems} />

      {/* TAB FEATURES -> carrusel con pestañas */}
      <AnvogueProductTabs
        tabs={[
          { label: "Lo más vendido", products: bestSellers },
          { label: "Ofertas", products: deals },
          { label: "Destacados", products: featured },
        ]}
      />

      {/* DUAL BANNER */}
      <div className={`${container} md:pt-20 pt-10`}>
        <div className="banner-block style-one grid sm:grid-cols-2 gap-5">
          {[
            { img: `${IMG}/banner/1.png`, title: "Lo más vendido", href: "/productos" },
            { img: `${IMG}/banner/2.png`, title: "Ofertas", href: "/categorias/ofertas/" },
          ].map((b) => (
            <Link
              key={b.title}
              href={b.href}
              className="banner-item group relative block overflow-hidden rounded-2xl duration-500"
            >
              <div className="banner-img aspect-[20/13] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.img}
                  alt=""
                  className="h-full w-full object-cover duration-1000 group-hover:scale-105"
                />
              </div>
              <div className="banner-content absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <div className={`${heading2} text-white`}>{b.title}</div>
                <div
                  className={`${textButton} text-white relative inline-block pb-1 border-b-2 border-white duration-500 mt-2`}
                >
                  Comprar
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* BENEFITS */}
      <div className={container}>
        <div className="benefit-block md:py-20 py-10">
          <div className="list-benefit grid items-start lg:grid-cols-4 grid-cols-2 gap-[30px]">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="benefit-item flex flex-col items-center justify-center">
                  <Icon className="lg:h-16 lg:w-16 h-12 w-12" strokeWidth={1.25} />
                  <div className={`${heading6} text-center mt-5`}>{b.title}</div>
                  <div className={`${caption1} text-center mt-3`} style={{ color: C.secondary }}>
                    {b.sub}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INSTAGRAM */}
      <AnvogueInstagram title="Seguinos en redes" tag="Inspiración para tu día a día" />

      {/* BRANDS */}
      <AnvogueBrands />
    </div>
  );
}
