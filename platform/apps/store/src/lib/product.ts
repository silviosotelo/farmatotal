/**
 * Helper para obtener el valor efectivo de un producto (override > ERP).
 * Centraliza la lógica de ADMIN-PLAN §2.
 */
import type { Product, Category } from "@prisma/client";

export function displayTitle(p: Product): string {
  return p.titleOverride ?? p.title;
}

export function displayDescription(p: Product): string | null {
  return p.descriptionOverride ?? p.description;
}

export function displaySlug(p: Product): string {
  return p.slugOverride ?? p.slug;
}

export function displayCategoryName(c: Category): string {
  return c.nameOverride ?? c.name;
}

/**
 * Precio efectivo: priceWeb si hay promo, sino priceNormal.
 */
export function effectivePrice(p: Product): number {
  return p.onPromo ? p.priceWeb : p.priceNormal;
}

/**
 * Formatea precio en PYG (guaraníes).
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Genera slug desde título.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
