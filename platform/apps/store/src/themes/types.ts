import type { Product } from "@/types";
import type { ReviewsResult, ProductVariant } from "@/lib/api";

/**
 * Contrato de props para las páginas internas tematizadas. La ruta del clone
 * hace el fetch una sola vez y pasa los datos al componente del tema activo
 * (farmatotal = base inline; ekomart/anvogue = componentes propios).
 */
export type ThemeProductDetailProps = {
  product: Product;
  related: Product[];
  reviews: ReviewsResult;
  variants: ProductVariant[];
};

export type ThemeCatalogProps = {
  products: Product[];
  total: number;
  page: number;
  /** Título de la página (ej. "Catálogo (1.500)" o el nombre de la categoría). */
  title: string;
  /** Base para los links de paginación (default "/catalogo"). */
  basePath?: string;
  /** Mostrar paginación (default true). En categoría se trae todo y va en false. */
  paginated?: boolean;
};
