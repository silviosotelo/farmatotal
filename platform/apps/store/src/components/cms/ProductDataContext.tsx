"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/types";
import type { ReviewsResult, ProductVariant } from "@/lib/api";

export type ProductData = {
  product: Product;
  related: Product[];
  reviews: ReviewsResult;
  variants: ProductVariant[];
};

const Ctx = createContext<ProductData | null>(null);

/**
 * Provee el producto consultado por la ruta a los bloques data-bound del builder
 * (ProductDetail). Modelo "single template" estilo Elementor: la ruta hace el
 * fetch y el bloque lo consume por contexto.
 */
export function ProductDataProvider({
  value,
  children,
}: {
  value: ProductData;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProductData() {
  return useContext(Ctx);
}
