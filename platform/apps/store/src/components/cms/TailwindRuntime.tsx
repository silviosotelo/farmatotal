"use client";

import { useEffect } from "react";

/**
 * Motor Tailwind v4 en el navegador (JIT runtime). Compila EN VIVO cualquier
 * clase Tailwind que el contenido del builder traiga desde la DB — clases que
 * el build estático del sitio no puede conocer (viven en el CMS, no en el
 * código). Se carga una sola vez (módulo cacheado) y observa el DOM.
 *
 * Trade-off aceptado: es client-side (las clases del builder aplican tras
 * hidratación). Las clases del propio código del sitio ya vienen del build.
 */
export function TailwindRuntime() {
  useEffect(() => {
    // IIFE global: al importarse, escanea el documento e inyecta el CSS generado.
    import("@tailwindcss/browser").catch(() => {});
  }, []);
  return null;
}
