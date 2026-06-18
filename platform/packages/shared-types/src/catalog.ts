import { z } from "zod";

export const productStatusEnum = z.enum(["draft", "published", "archived"]);

export const categoryDTO = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  position: z.number().int(),
  fliaCodigo: z.string().nullable(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).nullable(),
  active: z.boolean(),
});
export type CategoryDTO = z.infer<typeof categoryDTO>;

export const categoryInput = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().optional(),
  fliaCodigo: z.string().max(40).nullable().optional(),
  icon: z.string().max(80).nullable().optional(),
  description: z.string().nullable().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  active: z.boolean().optional(),
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const brandDTO = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  active: z.boolean(),
});
export type BrandDTO = z.infer<typeof brandDTO>;

export const brandInput = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
export type BrandInput = z.infer<typeof brandInput>;

export const productImageDTO = z.object({
  id: z.string().uuid(),
  url: z.string(),
  alt: z.string().nullable(),
  position: z.number().int(),
  isPrimary: z.boolean(),
});

export const productDTO = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  codInterno: z.string().nullable(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  brandId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  priceNormal: z.number().int(),
  priceWeb: z.number().int(),
  onPromo: z.boolean(),
  promoCode: z.string().nullable(),
  controlled: z.boolean(),
  featured: z.boolean(),
  status: productStatusEnum,
  stockCached: z.number().int(),
  custom: z.record(z.string(), z.unknown()).nullable(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).nullable(),
  erpSourced: z.boolean(),
  sourceSystem: z.string().nullable(),
  sourceId: z.string().nullable(),
  syncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  images: z.array(productImageDTO).optional(),
});
export type ProductDTO = z.infer<typeof productDTO>;

export const productInput = z.object({
  sku: z.string().min(1).max(80),
  codInterno: z.string().max(80).nullable().optional(),
  slug: z.string().min(1).max(250),
  title: z.string().min(1).max(300),
  description: z.string().nullable().optional(),
  descriptionRich: z.unknown().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  priceNormal: z.number().int().nonnegative(),
  priceWeb: z.number().int().nonnegative(),
  onPromo: z.boolean().optional(),
  promoCode: z.string().nullable().optional(),
  controlled: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: productStatusEnum.optional(),
  stockCached: z.number().int().optional(),
  custom: z.record(z.string(), z.unknown()).nullable().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  erpSourced: z.boolean().optional(),
  sourceSystem: z.string().max(30).nullable().optional(),
  sourceId: z.string().max(80).nullable().optional(),
});
export type ProductInput = z.infer<typeof productInput>;

export const productListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  status: productStatusEnum.optional(),
  featured: z.coerce.boolean().optional(),
  onPromo: z.coerce.boolean().optional(),
  sort: z
    .enum(["createdAt:desc", "createdAt:asc", "title:asc", "priceWeb:asc", "priceWeb:desc"])
    .default("createdAt:desc"),
});
export type ProductListQuery = z.infer<typeof productListQuery>;

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });

export const productListResponse = paginated(productDTO);
export type ProductListResponse = z.infer<typeof productListResponse>;
