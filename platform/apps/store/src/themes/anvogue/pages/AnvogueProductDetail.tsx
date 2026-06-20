import Link from "next/link";
import { ChevronRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import type { ThemeProductDetailProps } from "@/themes/types";
import { formatGs } from "@/lib/format";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductTabs } from "@/components/product/ProductTabs";
import { BranchStock } from "@/components/product/BranchStock";
import { AnvogueProductCard } from "../AnvogueProductCard";
import { heading5 } from "../sections/anvogueClasses";

/**
 * Ficha de producto del tema Anvogue (fashion/retail, blanco y negro con acento
 * rojo). Server component: compone los componentes funcionales compartidos
 * (galería, acciones/carrito, tabs, stock por sucursal) dentro de contenedores
 * estilados a la paleta Anvogue. White-label: sin marca hardcodeada.
 */
export function AnvogueProductDetail({ product, related, reviews, variants }: ThemeProductDetailProps) {
  const hasDiscount = product.priceNormal > product.priceWeb && product.discount > 0;
  const outOfStock = product.stock === 0;
  const categoryHref = product.category ? `/categorias/${product.category}/` : "/productos";

  return (
    <div className="bg-white">
      {/* breadcrumb */}
      <div className="border-b border-[#E9E9E9] bg-[#F7F7F7]">
        <div className="mx-auto max-w-[1322px] px-4 py-4">
          <nav
            aria-label="Migas de pan"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-[#696C70]"
          >
            <Link href="/" className="transition-colors hover:text-[#DB4444]">
              Inicio
            </Link>
            <ChevronRight size={14} className="text-[#A0A0A0]" />
            {product.category ? (
              <>
                <Link href={categoryHref} className="transition-colors hover:text-[#DB4444]">
                  {product.category.replace(/-/g, " ")}
                </Link>
                <ChevronRight size={14} className="text-[#A0A0A0]" />
              </>
            ) : null}
            <span className="line-clamp-1 text-[#1F1F1F]">{product.title}</span>
          </nav>
        </div>
      </div>

      {/* dos columnas: galería + resumen */}
      <div className="mx-auto max-w-[1322px] px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* galería */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <ProductGallery
              images={product.gallery ?? [product.image]}
              alt={product.title}
              discount={product.discount}
            />
          </div>

          {/* resumen */}
          <div className="flex flex-col">
            {product.brand ? (
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#DB4444]">
                {product.brand}
              </span>
            ) : null}

            <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#1F1F1F] lg:text-4xl">
              {product.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.06em] text-[#696C70]">
              {product.sku ? <span>SKU: {product.sku}</span> : null}
              <span
                className={
                  outOfStock
                    ? "rounded-full bg-[#F7F7F7] px-3 py-1 font-semibold text-[#DB4444]"
                    : "rounded-full bg-[#F7F7F7] px-3 py-1 font-semibold text-[#1F8A4C]"
                }
              >
                {outOfStock ? "Sin stock" : "En stock"}
              </span>
            </div>

            {/* precio (.product-price heading5 · divisor · origin secondary2 · sale bg-green) */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-[#E9E9E9] pb-6">
              <span className={`${heading5} text-[#1F1F1F]`}>
                {formatGs(product.priceWeb)}
              </span>
              {hasDiscount ? (
                <>
                  <span className="h-4 w-px bg-[#E9E9E9]" />
                  <span className="text-lg font-normal text-[#A0A0A0] line-through">
                    {formatGs(product.priceNormal)}
                  </span>
                  <span className="inline-block rounded-full bg-[#D2EF9A] px-3 py-0.5 text-xs font-semibold text-[#1F1F1F]">
                    -{product.discount}%
                  </span>
                </>
              ) : null}
            </div>

            {product.description ? (
              <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-[#696C70]">
                {product.description}
              </p>
            ) : null}

            {/* acciones (carrito) — componente funcional compartido */}
            <div className="mt-6">
              <ProductActions product={product} variants={variants} />
            </div>

            {/* stock por sucursal */}
            <div className="mt-4">
              <BranchStock productId={product.id} />
            </div>

            {/* trust badges */}
            <ul className="mt-7 grid grid-cols-1 gap-3 border-t border-[#E9E9E9] pt-6 sm:grid-cols-3">
              {[
                { icon: Truck, label: "Envío a todo el país" },
                { icon: ShieldCheck, label: "Compra protegida" },
                { icon: RotateCcw, label: "Cambios y devoluciones" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-xs font-medium text-[#696C70]">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] text-[#1F1F1F]">
                    <Icon size={18} />
                  </span>
                  <span className="uppercase tracking-[0.04em]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* descripción / info / valoraciones */}
        <section className="mt-12 rounded-2xl border border-[#E9E9E9] bg-white p-6 lg:mt-16 lg:p-10">
          <ProductTabs product={product} reviews={reviews.data} average={reviews.average} />
        </section>

        {/* relacionados */}
        {related.length > 0 ? (
          <section className="mt-14 lg:mt-20">
            <div className="mb-7 flex flex-col items-center text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#DB4444]">
                Descubrí más
              </span>
              <h2 className="mt-2 text-2xl font-semibold text-[#1F1F1F] lg:text-3xl">
                También te puede gustar
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <AnvogueProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
