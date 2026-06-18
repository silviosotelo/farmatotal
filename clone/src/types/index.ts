export interface Category {
  slug: string;
  name: string;
  /** path under /public for the circle icon (optional for menu-only categories) */
  icon?: string;
  href: string;
}

export interface HeroSlide {
  id: string;
  image: string; // /public path
  alt: string;
  href: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  image: string; // /public path
  /** original price in Guaraníes (integer) */
  priceNormal: number;
  /** discounted web price in Guaraníes (integer) */
  priceWeb: number;
  /** discount percent badge, e.g. 16 */
  discount: number;
  /** category slug (e.g. "medicamentos") */
  category?: string;
  sku?: string;
  /** simulated stock units; 0 = out of stock */
  stock?: number;
  brand?: string;
  description?: string;
  /** extra image paths for the gallery */
  gallery?: string[];
  /** 0–5 */
  rating?: number;
  reviewCount?: number;
  /** id de la variante elegida (cuando esta línea es una variante). */
  variantId?: string;
  /** uuid del producto padre real (para el checkout cuando id es compuesto). */
  variantOf?: string;
  /** etiqueta de la variante (ej. "50 ml"). */
  variantLabel?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface PromoBanner {
  image: string;
  href: string;
  alt: string;
}

/** A line in the cart: the product + quantity */
export interface CartLine {
  product: Product;
  quantity: number;
}

export interface Coupon {
  code: string;
  /** percent off (0–100) */
  percent: number;
  description: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  isDefault?: boolean;
}

export interface OrderLine {
  title: string;
  sku?: string;
  quantity: number;
  price: number; // unit web price
  image?: string;
}

export type OrderStatus = "pendiente" | "procesando" | "completado" | "cancelado";

export interface Order {
  id: string; // e.g. "FT-10432"
  date: string; // ISO
  status: OrderStatus;
  total: number;
  sucursal?: string;
  paymentMethod?: string;
  lines: OrderLine[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  addresses?: {
    id: string;
    label?: string | null;
    line1: string;
    city: string;
    phone?: string | null;
    isDefault: boolean;
  }[];
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
}
