/**
 * Módulo erp_sync — registra los adapters disponibles al cargarse (estilo plugins).
 * Importar este archivo una vez al boot de la API registra todos los ERP soportados.
 */
import { registerAdapter } from "./adapters/types.js";
import { farmatotalAdapter } from "./adapters/farmatotal.js";
import { wooAdapter } from "./adapters/woo.js";
import { restAdapter } from "./adapters/rest.js";

let registered = false;

export function registerErpAdapters() {
  if (registered) return;
  registered = true;
  registerAdapter(farmatotalAdapter);
  registerAdapter(wooAdapter);
  registerAdapter(restAdapter);
}
