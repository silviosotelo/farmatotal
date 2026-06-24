/**
 * Registro canónico de bloques del page-builder (ChaiBuilder).
 * Fuente única de verdad compartida entre el admin (editor) y el storefront (render).
 * El admin importa estos tipos en build; el motor lo sirve en runtime vía GET /cms/blocks
 * para que el clone (proyecto separado) valide su set de bloques contra el canónico.
 */

export type BlockProps = {
  Hero: {
    title: string;
    subtitle: string;
    image: string;
    ctaText: string;
    ctaHref: string;
    align: "left" | "center";
  };
  Heading: { text: string; level: "h1" | "h2" | "h3" };
  Text: { text: string };
  ImageBlock: { src: string; alt: string; rounded: boolean };
  Button: { label: string; href: string; variant: "solid" | "outline" };
  Banner: { text: string; bg: string; color: string };
  Columns: { columns: { count: "2" | "3" | "4" } };
  ProductGrid: { heading: string; limit: number; source: "featured" | "latest" };
  Features: { items: { icon: string; title: string; text: string }[] };
  FAQ: { items: { q: string; a: string }[] };
  CTA: { title: string; text: string; buttonText: string; buttonHref: string };
  Testimonials: { items: { name: string; text: string }[] };
  BranchMap: { heading: string };
  HeroSlider: { note: string };
  HomeSlider: { note: string };
  HomeCategories: { note: string };
  HomeDeals: { limit: number };
  HomeFeatured: { limit: number };
  HomePromoBanner: { index: number };
  Spacer: { size: number };
};

export type BlockType = keyof BlockProps;

/** Lista runtime de los tipos de bloque canónicos (orden = orden en el editor). */
export const BLOCK_TYPES: BlockType[] = [
  "Hero",
  "Heading",
  "Text",
  "ImageBlock",
  "Button",
  "Banner",
  "Columns",
  "ProductGrid",
  "Features",
  "FAQ",
  "CTA",
  "Testimonials",
  "BranchMap",
  "HeroSlider",
  "HomeSlider",
  "HomeCategories",
  "HomeDeals",
  "HomeFeatured",
  "HomePromoBanner",
  "Spacer",
];

/** Props por defecto de cada bloque (las usa el editor al insertar y el render como fallback). */
export const blockDefaults: { [K in BlockType]: BlockProps[K] } = {
  Hero: {
    title: "Título principal",
    subtitle: "Subtítulo descriptivo",
    image: "",
    ctaText: "Ver más",
    ctaHref: "#",
    align: "center",
  },
  Heading: { text: "Encabezado", level: "h2" },
  Text: { text: "Escribí tu contenido acá." },
  ImageBlock: { src: "", alt: "", rounded: true },
  Button: { label: "Botón", href: "#", variant: "solid" },
  Banner: { text: "¡Promoción!", bg: "#f16522", color: "#ffffff" },
  Columns: { columns: { count: "2" } },
  ProductGrid: { heading: "Productos", limit: 8, source: "featured" },
  Features: { items: [] },
  FAQ: { items: [] },
  CTA: { title: "¿Listo?", text: "Sumate hoy.", buttonText: "Empezar", buttonHref: "#" },
  Testimonials: { items: [] },
  BranchMap: { heading: "Nuestras sucursales" },
  HeroSlider: { note: "Slider del home (datos reales)" },
  HomeSlider: { note: "Slider clásico del home" },
  HomeCategories: { note: "Círculos de categorías" },
  HomeDeals: { limit: 12 },
  HomeFeatured: { limit: 8 },
  HomePromoBanner: { index: 0 },
  Spacer: { size: 24 },
};
