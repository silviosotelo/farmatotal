import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import RecoverPasswordFallback from "./RecoverPasswordFallback";

/**
 * /recuperar-contrasena en el patrón builder: si el documento "recuperar-contrasena"
 * está publicado y tiene bloques, lo renderiza con ChaiRender (incluye el
 * PasswordRecoveryBlock, data-bound al API). Si no, cae al fallback nativo que
 * dispara el mismo flujo real de recuperación contra el API del tenant.
 */
export default async function RecuperarContrasenaPage() {
  const page = await getPage("recuperar-contrasena").catch(() => null);
  if (page?.published && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <main className="flex-1">
        <h1 className="sr-only">Recuperar contraseña</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  return <RecoverPasswordFallback />;
}
