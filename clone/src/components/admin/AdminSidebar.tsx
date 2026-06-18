"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Pedidos", icon: "📦" },
  { href: "/admin/products", label: "Productos", icon: "💊" },
  { href: "/admin/customers", label: "Clientes", icon: "👥" },
  { href: "/admin/coupons", label: "Cupones", icon: "🎫" },
  { href: "/admin/reviews", label: "Reseñas", icon: "⭐" },
  { href: "/admin/pages", label: "Páginas", icon: "📄" },
  { href: "/admin/sync", label: "Sync ERP", icon: "🔄" },
    { href: "/admin/settings", label: "Configuración", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <Link href="/admin" className="text-xl font-bold text-green-400">
          Farmatotal Admin
        </Link>
      </div>
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-green-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 pt-4 border-t border-gray-700">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white">
          ← Volver al sitio
        </Link>
      </div>
    </aside>
  );
}
