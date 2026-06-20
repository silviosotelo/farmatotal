import { getActiveTheme } from "@/themes/registry";
import { EkomartHome } from "@/themes/ekomart/EkomartHome";
import { AnvogueHome } from "@/themes/anvogue/AnvogueHome";
import { FarmatotalHome } from "@/components/FarmatotalHome";

export default async function Home() {
  const theme = await getActiveTheme();

  // Home nativo, system-driven (consume datos del backend). Ya NO usamos el page
  // builder para el home: cada tema renderiza su propia composición nativa, y los
  // estilos/colores/logo vienen del sistema (store_config + tokens de marca).
  if (theme === "ekomart") {
    return <EkomartHome />;
  }
  if (theme === "anvogue") {
    return <AnvogueHome />;
  }
  return <FarmatotalHome />;
}
