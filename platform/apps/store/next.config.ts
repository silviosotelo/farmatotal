import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ft/ui es un paquete del workspace que se consume como fuente TS/JSX;
  // Next debe transpilarlo.
  transpilePackages: ["@ft/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.farmatotal.com.py" },
      { protocol: "https", hostname: "farmatotal.com.py" },
    ],
    // El optimizador server-side de Next falla al traer imágenes remotas detrás
    // del MITM corporativo (cert self-signed) → 500 en /_next/image. Servimos
    // sin optimizar para que el navegador las cargue directo (usa el trust store
    // del SO). Revisar cuando las imágenes migren a almacenamiento propio (R2).
    unoptimized: true,
  },
  // URLs canónicas en plural. Redirige el singular legacy (308 permanente) para
  // no perder SEO / enlaces guardados del sitio anterior.
  async redirects() {
    return [
      { source: "/producto/:slug", destination: "/productos/:slug", permanent: true },
      { source: "/categoria/:slug", destination: "/categorias/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
