import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-heading text-[96px] font-bold leading-none text-brand-orange">404</p>
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-text">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-brand-muted">
        La página que buscás no existe o fue movida. Volvé al inicio o explorá nuestro catálogo.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="brand-gradient focus-ring flex h-[44px] items-center rounded-[30px] px-6 text-sm font-semibold text-white">
          Volver al inicio
        </Link>
        <Link href="/catalogo" className="focus-ring flex h-[44px] items-center rounded-[30px] border border-brand-orange px-6 text-sm font-semibold text-brand-orange-ink transition hover:bg-brand-orange hover:text-white">
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
