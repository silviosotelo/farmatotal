import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import MisFavoritosNative from "./MisFavoritosNative";

/**
 * Mis Favoritos: si el documento "mis-favoritos" está publicado en el builder
 * (con el WishlistBlock data-bound), manda el builder; si no, cae al contenido
 * nativo (MisFavoritosNative, mismos datos vía useWishlist → /api/wishlist).
 */
export default async function MisFavoritosPage() {
  const page = await getPage("mis-favoritos").catch(() => null);

  if (page?.published && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: page.title || "Mis Favoritos" }]} />
        <h1 className="sr-only">Mis Favoritos</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  return <MisFavoritosNative />;
}
