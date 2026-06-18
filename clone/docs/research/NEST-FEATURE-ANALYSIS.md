# Análisis de features — theme "SteelThemes Nest" v1.8.6

> Inspiración de **alcance de features** y **catálogo de secciones** para la plataforma. Nest es un theme WooCommerce de grocery con Elementor; NO usamos WordPress, extraemos el modelo. Documento de referencia para [`PAGE-BUILDER.md`](./PAGE-BUILDER.md) y [`PLATFORM-VISION.md`](./PLATFORM-VISION.md). Reconstruido del `changelog.txt`, 169 opciones Redux, 33 plantillas Elementor y los plugins.

## 1. Set de features e-commerce
- **Shop/Catálogo:** grid y list, sidebar izq/der/wide, filtros por categoría/marca (on-click), filtro out-of-stock, "active filters", paginación clásica + **load more** + **infinite scroll**, items/página y orden configurables.
- **Ficha de producto:** 4 estilos, galería con video, **sticky add-to-cart**, **frequently bought together**, upsells/related, **sold progress bar** (vendidos/stock), badges, breadcrumbs, share social.
- **Carrito/Checkout:** AJAX add-to-cart con notificación, **mini-cart** lateral, empty-cart, cupones colapsables.
- **Cuenta:** My Account templateado; **multi-vendor** (Dokan/WCFM/MultiVendorX).
- **Wishlist + Compare:** WPClever (`woosw`/`woosc`) con contador en header. **Quick View:** YITH. **Búsqueda AJAX:** FiboSearch.
- **Marcas (Brand):** taxonomía propia, archivo, widgets de filtro y carrusel.
- **Recently Viewed**, **Active filters**, mega-menú, side-menu, floating menu móvil, header sticky, preloader, back-to-top, RTL, popup/newsletter, topbar news carousel, header/footer builder, hotline box.

## 2. Homepage por secciones (9 homes)
Patrón home-1: `slider > title > list-items(USP) > category-grid > 3×shop-banner > title > product-tab-filter > shop-banner > product-tab-filter-carousel > product-deals(countdown) > 4×(title+product-shop) > popup`. Variantes agregan sidebar vertical, brand, grid, blog, testimonial (home-9 = la más rica, 47 widgets). **Tipos de página:** shop grid/list × sidebar; blog big/grid/list/wide; about (icon-box, fun-facts, team); contact (box + form + maps). Headers (5) y footers (4) también son plantillas del builder.

## 3. Plugins incluidos
- **nest-addons** (propio): registra todos los widgets `nest-*`, metaboxes, Redux (theme options), demo importer, integración Woo/Dokan.
- **revslider** (hero sliders). Requeridos vía importer: Elementor, WooCommerce, Dokan, FiboSearch, YITH Quick View, WPClever Wishlist/Compare, CF7, HubSpot.

## 4. Catálogo de widgets (37 `nest-*`) → base del page builder
**Producto/Shop:** `product-shop` (grid/list por query — el más usado, 31×), `product-carousel`, `product-tab-filter` / `product-tab-filter-carousel` (tabs por categoría), `product-deals-v1/v2` / `deals-v1` (**ofertas con countdown** `deal_day/hours/min/sec`), `category-grid`, `category-list`/sidebar vertical, `brand`.
**Banners/Hero:** `slider`, `single-banner`, `shop-banner` (banner promocional con link — 39×), `image-grid`, `grid`.
**Contenido/Marketing:** `title` (108×), `text-editor`, `icon-box` (USP), `list-items`, `fun-facts`, `team`, `testimonial`, `blog`, `social-media`, `subscribe` (newsletter), `simple-image-box`, `popup`, `themebtns`, `contact-box`, `contact-form`, `sidebar`.
**Header builder:** `header-v1`, `custom-menu` (mega-menú), `category-header` (dropdown "all categories"), `extra-header-items` (cart/wishlist/compare/account/search), `hotline-box`.
**Footer builder:** `foo-widget-navigation`, `foo-widget-about-contact`.

## 5. Feature-flags (de 169 redux keys) → toggles del admin
`quick_view_enable`, `add_to_cart_enable_disable`, `badge_enable`, `rating_enable`, `brand_enable`, `sold_items_enable`, `header_sticky`, `preloader_enables`, `rtl_enables`, `product_archive_layouts` (grid/list), `product_paginaion_type` (paginación/loadmore/infinite), `deal_day/hours/min/sec` (countdown global), `side_menu_enable`, `mobile_floating_enable`.

**Rutas:** widgets en `nest-addons/includes/Core/Widgets/{Shop,Content,Slider,Header,Footer}/`; opciones en `democontent/demo-content-1/redux-1.json`; homes en `elementor templates/home/home-*.json`.
