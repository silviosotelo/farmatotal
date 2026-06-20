# Page Builder — páginas editables por secciones

> Hijo de [`PLATFORM-VISION.md`](./PLATFORM-VISION.md). Permite editar la **homepage e internas por secciones** desde el admin, reemplazando Elementor. Catálogo de bloques inspirado en los 37 widgets de Nest (ver [`NEST-FEATURE-ANALYSIS.md`](./NEST-FEATURE-ANALYSIS.md)).

---

## 1. Modelo de datos — bloques como JSONB

Una página es una **lista ordenada de bloques tipados**. Mismo patrón JSONB que los custom fields.

```prisma
model Page {
  id        String   @id @default(cuid())
  slug      String   @unique          // "home", "ofertas", "nosotros"
  title     String
  blocks    Json     @default("[]")   // [{ id, type, props }]
  status    PageStatus @default(DRAFT) // DRAFT | PUBLISHED
  seoTitle       String?
  seoDescription String?
  updatedAt DateTime @updatedAt
}
```

Cada bloque: `{ id: string, type: BlockType, props: object }`. Los `props` se versionan **por tipo de bloque** → renombrar/editar un componente no rompe páginas guardadas (se migra el schema del tipo, no cada página).

---

## 2. Catálogo de bloques v1 (~12 tipos)

Consolidación de los 37 widgets `nest-*` en lo que realmente se construye. Cada uno es un **React Server Component** que recibe `props` y renderiza contra los datos reales (catálogo, categorías, etc.).

| Tipo | Props clave | Origen Nest |
|---|---|---|
| `HeroSlider` | `slides[]{image, link, días, plataforma}` | slider / revslider + `[custom_slider]` actual |
| `CategoryGrid` | `categories[]` o `auto`, `columns` | category-grid / category-list |
| `ProductCarousel` | `query{category, ids, tag}`, `limit`, `title` | product-carousel |
| `ProductGrid` | `query`, `limit`, `layout(grid\|list)` | product-shop |
| `ProductTabs` | `tabs[]{label, query}` | product-tab-filter(-carousel) |
| `ProductDeals` | `query{porcDcto>=N}`, `countdownTo` | product-deals-v1/v2 (ofertas + countdown) |
| `ShopBanner` | `image, link, text` (1..N) | shop-banner / single-banner / image-grid |
| `IconBoxRow` | `items[]{icon, title, text}` | icon-box / list-items (USP) |
| `Testimonials` | `items[]` | testimonial |
| `Newsletter` | `title, placeholder` | subscribe |
| `BrandCarousel` | `brands[]` o `auto` | brand |
| `RichText` | `html` / markdown, `heading` | text-editor / title |

(`BlogGrid`, `FunFacts`, `Team`, `Popup` → fase 2, según necesidad.)

```prisma
enum BlockType {
  HERO_SLIDER CATEGORY_GRID PRODUCT_CAROUSEL PRODUCT_GRID PRODUCT_TABS
  PRODUCT_DEALS SHOP_BANNER ICON_BOX_ROW TESTIMONIALS NEWSLETTER BRAND_CAROUSEL RICH_TEXT
}
```

---

## 3. Editor — lista vertical de bloques, **no canvas WYSIWYG en v1**

- El editor es una **lista vertical reordenable** de bloques (drag para reordenar, no para posicionar en lienzo). Agregar → elegir tipo del catálogo. Cada bloque abre un **formulario tipado** (campos según su schema de props). 
- **Panel de preview** al lado renderiza el storefront real (mismo componente RSC) con los datos actuales.
- Acciones: agregar, reordenar, duplicar, ocultar, eliminar; guardar borrador / publicar.
- **Por qué no canvas en v1:** el WYSIWYG sobre lienzo es un agujero de 3 meses; la lista vertical + preview es shippable en semanas y cubre el 90% del valor ("editar la home por secciones"). El canvas se evalúa post-MVP.

El render del storefront: `renderBlocks(page.blocks)` mapea cada `{type, props}` a su componente. Bloque desconocido → se ignora con warning (forward-compatible).

---

## 4. Reuso del storefront actual

Los componentes ya construidos del clon se vuelven bloques con poco trabajo:
- `HeroSlider` (Embla) → bloque `HeroSlider`.
- `CategoryCircles` → `CategoryGrid`.
- `SuperRombo` (carrusel + countdown) → `ProductDeals`.
- `SeleccionParaVos` / carruseles → `ProductCarousel` / `ProductTabs`.
- `PromoBanners` → `ShopBanner`.

Hoy estos leen de `src/lib/data.ts` (mock). Migración: sus datos pasan a `props` del bloque + queries reales al catálogo.

---

## 5. La home actual — **migración pixel-perfect** ✅ (decidido 2026-05-25)

Importer que lee `_elementor_data` (volcado de MySQL) y mapea cada widget Elementor → `BlockType`. Fiel al sitio vivo (+1–2 semanas).

**Pasos del importer:**
1. **Snapshot** ✅ hecho (2026-05-25): JSON crudo en `clone/docs/research/elementor-dump/` (home=773 + internas + kit). Ver su `README.md` con inventario y tabla de mapeo. El sitio real usa el theme **Bacola** (widgets `bacola-*`), NO Nest.
2. **Tabla de mapeo widget Bacola→bloque** (de la home real): `shortcode([custom_slider])→HERO_SLIDER`, `bacola-product-categories→CATEGORY_GRID`, `bacola-product-carousel→PRODUCT_CAROUSEL`, `countdown(+carousel)→PRODUCT_DEALS`, `image→SHOP_BANNER`, `heading→RICH_TEXT`, `bacola-hero-banner→SHOP_BANNER`. Widgets sin equivalente → log + `RICH_TEXT` de fallback. (Detalle en `elementor-dump/README.md`.)
3. **Extracción de props** por widget (settings de Elementor → props del bloque): títulos, queries (categoría/ids), imágenes (resolver URLs R2), límites, columnas.
4. **Seed** de `Page(slug="home")` con los bloques resultantes; revisión visual contra el sitio vivo.

---

## 6. Sub-fases
1. **Render**: `Page` + `renderBlocks` + 4 bloques núcleo (HeroSlider, CategoryGrid, ProductCarousel, ProductDeals). Home servida desde DB.
2. **Editor**: lista vertical + formularios tipados + preview + publish.
3. **Catálogo completo** de bloques v1 (los 12) + páginas internas (ofertas, nosotros, contacto).
4. **Home actual** según fork elegido.
5. (Fase 2) header/footer builder, bloques de blog/team/popup, A/B de secciones.
