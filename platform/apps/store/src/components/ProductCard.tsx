"use client";

import Image from "next/image";
import Link from "next/link";
import { useMoney } from "@/components/providers/CurrencyContext";
import type { Product } from "@/types";
import { HeartIcon } from "@/components/icons";
import { useCart } from "@/components/providers/CartContext";
import { useWishlist } from "@/components/providers/WishlistContext";
import { useToast } from "@/components/providers/ToastContext";
import { cn } from "@/lib/utils";
import { StockBadge } from "@/themes/CatalogStock";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

export function ProductCard({ product }: { product: Product }) {
  const money = useMoney();
  const href = `/productos/${product.slug}/`;
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const { toast } = useToast();
  const flags = useFlags();
  const fav = has(product.id);
  // Inventario oculto (inventory=false): nunca "agotado" ni tope de stock.
  const out = flags.inventory ? product.stock === 0 : false;

  const onAdd = () => {
    addItem(product);
    toast(`"${product.title}" agregado al carrito`);
  };
  const onFav = () => {
    toggle(product);
    toast(fav ? "Quitado de favoritos" : "Agregado a favoritos", "info");
  };

  return (
    <div className="group card-shadow relative flex h-full flex-col overflow-hidden rounded-[10px] border border-[#ededf1] bg-white transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-transparent hover:[box-shadow:0_14px_34px_rgba(241,101,34,0.14),0_6px_14px_rgba(16,24,40,0.08)]">
      {/* thumbnail */}
      <div className="relative p-5">
        {product.discount > 0 && (
          <span className="font-price absolute left-3 top-3 z-10 rounded-[8px] bg-brand-orange px-2 py-1 text-xs font-bold leading-none text-white shadow-[0_2px_6px_rgba(241,101,34,0.35)]">
            -{product.discount}%
          </span>
        )}
        {out && (
          <span className="absolute left-3 top-11 z-10 rounded-[8px] bg-[#7a7a7a] px-2 py-1 text-[10px] font-bold uppercase leading-none text-white">
            Sin stock
          </span>
        )}
        {/* wishlist */}
        <button
          type="button"
          aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
          aria-pressed={fav}
          onClick={onFav}
          className={cn(
            "focus-ring absolute right-3 top-3 z-10 flex size-8 -translate-y-1 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
            fav ? "text-[#e74c3c] opacity-100" : "text-brand-muted opacity-0 hover:text-brand-orange",
          )}
        >
          <HeartIcon className="size-4" fill={fav ? "currentColor" : "none"} />
        </button>
        <Link href={href} className="focus-ring block rounded-md">
          <div className="relative aspect-square w-full">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 50vw, 220px"
                className={cn(
                  "object-contain transition-transform duration-500 ease-out group-hover:scale-110",
                  out && "opacity-60",
                )}
              />
            ) : (
              <div
                aria-hidden
                className={cn(
                  "flex h-full w-full items-center justify-center bg-[#f5f5f7] text-xs text-brand-muted",
                  out && "opacity-60",
                )}
              >
                Sin imagen
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* content */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="mb-2 h-[50px] text-sm font-medium leading-[1.4] text-brand-text">
          <Link href={href} className="focus-ring line-clamp-2 rounded-sm transition-colors hover:text-brand-orange">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto font-price">
          <div className="text-[13px] leading-tight text-price-muted">
            Precio Normal: <span className="line-through">{money(product.priceNormal)}</span>
          </div>
          <div className="flex items-baseline gap-1.5 leading-snug">
            <span className="text-xs font-medium text-brand-muted">Precio Web:</span>
            <span className="text-[22px] font-bold text-brand-orange">{money(product.priceWeb)}</span>
          </div>
          <div className="mt-1.5">
            <StockBadge sku={product.sku ?? ""} />
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={out}
          className="brand-gradient focus-ring mt-4 flex h-[38px] w-full items-center justify-center rounded-[30px] px-5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(241,101,34,0.25)] transition-all duration-200 hover:shadow-[0_6px_16px_rgba(241,101,34,0.4)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {out ? "Sin stock" : "Añadir al carrito"}
        </button>
      </div>
    </div>
  );
}
