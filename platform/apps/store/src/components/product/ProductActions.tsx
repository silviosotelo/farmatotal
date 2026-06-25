"use client";

import { useState } from "react";
import { Button } from "@platform/ui";
import type { Product } from "@/types";
import type { ProductVariant } from "@/lib/api";
import { useCart } from "@/components/providers/CartContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { formatQty, stepQty, unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

export function ProductActions({
  product,
  variants = [],
}: {
  product: Product;
  variants?: ProductVariant[];
}) {
  const money = useMoney();
  const { addItem } = useCart();
  const { toast } = useToast();
  const flags = useFlags();
  const step = product.unitStep ?? 1;
  const [qty, setQty] = useState(step);
  const [variantId, setVariantId] = useState<string | null>(
    variants.length ? variants[0].id : null,
  );

  const variant = variants.find((v) => v.id === variantId) ?? null;

  const effPriceWeb = variant && variant.priceWeb > 0 ? variant.priceWeb : product.priceWeb;
  const effPriceNormal =
    variant && variant.priceNormal > 0 ? variant.priceNormal : product.priceNormal;
  const effStock = variant ? variant.stockCached : (product.stock ?? 99);
  const out = flags.inventory ? effStock === 0 : false;
  const max = flags.inventory ? effStock || 99 : Number.MAX_SAFE_INTEGER;

  const add = () => {
    if (out) return;
    const item: Product = variant
      ? {
          ...product,
          id: `${product.id}__${variant.id}`,
          variantOf: product.id,
          variantId: variant.id,
          variantLabel: variant.title,
          sku: variant.sku,
          title: `${product.title} — ${variant.title}`,
          priceWeb: effPriceWeb,
          priceNormal: effPriceNormal,
          stock: effStock,
          image: variant.imageUrl || product.image,
        }
      : product;
    addItem(item, qty);
    toast(`${formatQty(qty)} ${unitLabel(item)} × "${item.title}" agregado al carrito`);
  };

  return (
    <div className="flex flex-col gap-3">
      {variants.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-brand-muted">Presentación</span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const vOut = flags.inventory ? v.stockCached === 0 : false;
              return (
                <Button
                  key={v.id}
                  type="button"
                  disabled={vOut}
                  onClick={() => { setVariantId(v.id); setQty(step); }}
                  variant={v.id === variantId ? "solid" : "plain"}
                  shape="round"
                  size="md"
                  style={v.id === variantId ? { color: 'white' } : undefined}
                  className={cn(
                    v.id === variantId
                      ? "brand-gradient border border-brand-orange"
                      : "border border-[#ededf1] text-brand-muted hover:border-brand-orange/60 bg-white",
                    vOut && "cursor-not-allowed opacity-50 line-through",
                  )}
                >
                  {v.title}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div className="font-price flex items-baseline gap-2">
          <span className="text-[24px] font-bold leading-none text-brand-orange">
            {money(effPriceWeb)}
          </span>
          {effPriceNormal > effPriceWeb && (
            <span className="text-sm text-price-muted line-through">{money(effPriceNormal)}</span>
          )}
        </div>
      )}

      {out ? (
        <div className="rounded-lg bg-[#fdeceb] px-4 py-3 text-sm font-medium text-[#c0392b]">
          {variant ? "Esta presentación está sin stock." : "Producto sin stock por el momento."}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-[44px] items-center overflow-hidden rounded-[8px] border border-[#ededf1]">
            <Button
              type="button"
              variant="plain"
              aria-label="Disminuir"
              onClick={() => setQty((q) => stepQty(q, step, -1))}
              className="h-full rounded-none px-4 text-base text-brand-muted hover:bg-gray-50"
            >
              −
            </Button>
            <span
              className="flex h-full min-w-[40px] items-center justify-center whitespace-nowrap border-x border-[#ededf1] px-4 text-sm font-medium tabular-nums"
              aria-live="polite"
            >
              {formatQty(qty)} {unitLabel(product)}
            </span>
            <Button
              type="button"
              variant="plain"
              aria-label="Aumentar"
              onClick={() => setQty((q) => Math.min(max, stepQty(q, step, 1)))}
              className="h-full rounded-none px-4 text-base text-brand-muted hover:bg-gray-50"
            >
              +
            </Button>
          </div>
          <Button
            type="button"
            variant="solid"
            shape="round"
            onClick={add}
            style={{ color: 'white' }}
            className="brand-gradient h-[44px] px-8 text-sm font-semibold tracking-wide shadow-[0_4px_12px_rgba(var(--brand-orange-rgb),0.25)] hover:shadow-[0_6px_16px_rgba(var(--brand-orange-rgb),0.4)] active:scale-[0.98]"
          >
            Añadir al carrito
          </Button>
        </div>
      )}
    </div>
  );
}
