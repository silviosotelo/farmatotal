"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useAuth } from "@/components/providers/AuthContext";
import { useToast } from "@/components/providers/ToastContext";
import { formatGs } from "@/lib/data";

type Tab = "login" | "register";
type Section = "escritorio" | "pedidos" | "direcciones" | "detalles";

const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  PENDING: "bg-gray-100 text-brand-muted",
  CANCELLED: "bg-red-100 text-red-700",
};

interface OrderLine {
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderItem {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string | null;
  shippingMethod: string | null;
  lines: OrderLine[];
  createdAt: string;
}

export default function MiCuentaPage() {
  const { user, isLoggedIn, login, register, logout } = useAuth();
  const { toast } = useToast();

  /* ── Guest state ── */
  const [tab, setTab] = useState<Tab>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regLast, setRegLast] = useState("");

  /* ── Dashboard state ── */
  const [section, setSection] = useState<Section>("escritorio");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* ── Details form ── */
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [detailEmail, setDetailEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setDetailEmail(user.email ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  // Fetch orders when user logs in
  useEffect(() => {
    if (!isLoggedIn) return;
    setOrdersLoading(true);
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setOrders(data.items ?? []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await login(loginEmail, loginPass);
    toast(r.message, r.ok ? "success" : "error");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await register({ email: regEmail, password: regPass, firstName: regName, lastName: regLast });
    toast(r.message, r.ok ? "success" : "error");
  };

  const handleLogout = async () => {
    await logout();
    toast("Sesión cerrada", "info");
    setSection("escritorio");
    setOrders([]);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Cambios guardados", "success");
  };

  const navItems: { id: Section; label: string }[] = [
    { id: "escritorio", label: "Escritorio" },
    { id: "pedidos", label: "Pedidos" },
    { id: "direcciones", label: "Direcciones" },
    { id: "detalles", label: "Detalles de la cuenta" },
  ];

  return (
    <main className="flex-1">
      <h1 className="sr-only">Mi Cuenta</h1>
      <Breadcrumbs items={[{ label: "Mi Cuenta" }]} />

      {/* ── GUEST ── */}
      {!isLoggedIn && (
        <div className="ft-container py-10">
          <div className="max-w-lg mx-auto border border-[#ededf1] rounded-[10px] p-8">
            {/* Tabs */}
            <div className="flex justify-center gap-8 mb-8 border-b border-[#ededf1] pb-4">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={
                    tab === t
                      ? "focus-ring rounded-sm font-heading font-bold text-brand-text text-sm tracking-wide uppercase"
                      : "focus-ring rounded-sm text-sm text-brand-muted uppercase tracking-wide"
                  }
                >
                  {t === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            {/* LOGIN */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="login-email" className="text-sm text-brand-text mb-1 block">Email *</label>
                  <input id="login-email" type="email" autoComplete="username" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="login-pass" className="text-sm text-brand-text mb-1 block">Contraseña *</label>
                  <input id="login-pass" type="password" autoComplete="current-password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" className="brand-gradient focus-ring text-white rounded-[8px] h-[48px] w-full text-sm font-semibold">
                  Iniciar sesión
                </button>
                <Link href="/recuperar-contrasena" className="focus-ring rounded-sm text-sm text-brand-orange-ink font-medium underline-offset-2 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </form>
            )}

            {/* REGISTER */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-brand-text mb-1 block">Nombre *</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm text-brand-text mb-1 block">Apellido *</label>
                    <input type="text" required value={regLast} onChange={(e) => setRegLast(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-brand-text mb-1 block">Email *</label>
                  <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-brand-text mb-1 block">Contraseña *</label>
                  <input type="password" required minLength={6} value={regPass} onChange={(e) => setRegPass(e.target.value)} className={inputClass} />
                </div>
                <p className="text-xs text-brand-muted">
                  Al registrarte aceptás nuestra{" "}
                  <Link href="/politica-de-privacidad" className="text-brand-orange-ink underline">política de privacidad</Link>.
                </p>
                <button type="submit" className="brand-gradient focus-ring text-white rounded-[8px] h-[48px] w-full text-sm font-semibold">
                  Registrarse
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {isLoggedIn && user && (
        <div className="ft-container py-8">
          <p className="text-brand-muted text-sm mb-6">
            Hola, <span className="font-semibold text-brand-text">{user.firstName}</span>{" "}
            (¿No sos vos?{" "}
            <button type="button" onClick={handleLogout} className="text-brand-orange-ink underline-offset-2 hover:underline text-sm">Cerrar sesión</button>)
          </p>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar nav */}
            <aside className="md:w-56 flex-shrink-0">
              <nav className="border border-[#ededf1] rounded-[10px] overflow-hidden">
                {navItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSection(item.id)}
                    className={"w-full text-left px-5 py-3 text-sm transition-colors border-b border-[#ededf1] last:border-0 " + (section === item.id ? "bg-brand-orange text-white font-semibold" : "text-brand-text hover:bg-search-bg")}>
                    {item.label}
                  </button>
                ))}
                <button type="button" onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  Cerrar sesión
                </button>
              </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">

              {/* ESCRITORIO */}
              {section === "escritorio" && (
                <div className="space-y-6">
                  <h2 className="font-heading text-xl font-bold text-brand-text">Escritorio</h2>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    Desde el panel de tu cuenta podés ver tus{" "}
                    <button type="button" onClick={() => setSection("pedidos")} className="text-brand-orange-ink hover:underline">pedidos recientes</button>,{" "}
                    administrar tus{" "}
                    <button type="button" onClick={() => setSection("direcciones")} className="text-brand-orange-ink hover:underline">direcciones</button>{" "}
                    y{" "}
                    <button type="button" onClick={() => setSection("detalles")} className="text-brand-orange-ink hover:underline">editar tus datos</button>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {navItems.slice(1).map((item) => (
                      <button key={item.id} type="button" onClick={() => setSection(item.id)}
                        className="border border-[#ededf1] rounded-[10px] p-5 text-left hover:border-brand-orange/40 hover:bg-search-bg transition-colors">
                        <span className="block font-semibold text-brand-text text-sm mb-1">{item.label}</span>
                        <span className="text-xs text-brand-muted">
                          {item.id === "pedidos" && `${orders.length} pedido(s)`}
                          {item.id === "direcciones" && `${user.addresses?.length ?? 0} dirección(es)`}
                          {item.id === "detalles" && user.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PEDIDOS */}
              {section === "pedidos" && (
                <div className="space-y-4">
                  <h2 className="font-heading text-xl font-bold text-brand-text">Pedidos</h2>
                  {ordersLoading ? (
                    <p className="text-sm text-brand-muted">Cargando pedidos...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-brand-muted">No tenés pedidos aún.</p>
                  ) : (
                    <div className="border border-[#ededf1] rounded-[10px] overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-search-bg text-brand-muted text-xs uppercase tracking-wide">
                          <tr>
                            <th className="text-left px-4 py-3">Pedido</th>
                            <th className="text-left px-4 py-3 hidden sm:table-cell">Fecha</th>
                            <th className="text-left px-4 py-3">Estado</th>
                            <th className="text-right px-4 py-3">Total</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <>
                              <tr key={order.id} className="border-t border-[#ededf1]">
                                <td className="px-4 py-3 font-medium text-brand-text">{order.number}</td>
                                <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">{new Date(order.createdAt).toLocaleDateString("es-PY")}</td>
                                <td className="px-4 py-3">
                                  <span className={"inline-block px-2 py-0.5 rounded-full text-xs font-medium " + (STATUS_COLORS[order.status] ?? "bg-gray-100 text-brand-muted")}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-brand-text">{formatGs(order.total)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button type="button" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    className="text-brand-orange-ink text-xs hover:underline">
                                    {expandedOrder === order.id ? "Cerrar" : "Ver detalle"}
                                  </button>
                                </td>
                              </tr>
                              {expandedOrder === order.id && (
                                <tr className="border-t border-[#ededf1] bg-search-bg/50">
                                  <td colSpan={5} className="px-4 py-4">
                                    <div className="space-y-1 text-xs text-brand-muted mb-3">
                                      <p>Pago: <span className="text-brand-text">{order.paymentMethod ?? "—"}</span></p>
                                      <p>Envío: <span className="text-brand-text">{order.shippingMethod === "pickup" ? "Retiro en sucursal" : order.shippingMethod === "delivery" ? "Delivery" : "—"}</span></p>
                                    </div>
                                    <div className="space-y-2">
                                      {order.lines.map((line, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                          <span className="flex-1 text-brand-text text-xs">{line.title}</span>
                                          <span className="text-brand-muted text-xs">x{line.quantity}</span>
                                          <span className="font-medium text-brand-text text-xs">{formatGs(line.subtotal)}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {order.discount > 0 && (
                                      <p className="text-xs text-red-500 mt-2">Descuento: -{formatGs(order.discount)}</p>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* DIRECCIONES */}
              {section === "direcciones" && (
                <div className="space-y-4">
                  <h2 className="font-heading text-xl font-bold text-brand-text">Direcciones</h2>
                  {user.addresses && user.addresses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user.addresses.map((addr: { id: string; label?: string | null; line1: string; city: string; phone?: string | null; isDefault: boolean }) => (
                        <div key={addr.id} className="border border-[#ededf1] rounded-[10px] p-5 space-y-1 relative">
                          {addr.isDefault && (
                            <span className="absolute top-3 right-3 text-xs bg-brand-orange/10 text-brand-orange-ink px-2 py-0.5 rounded-full font-medium">Predeterminada</span>
                          )}
                          <p className="font-semibold text-brand-text text-sm">{addr.label ?? "Dirección"}</p>
                          <p className="text-sm text-brand-text">{addr.line1}</p>
                          <p className="text-sm text-brand-muted">{addr.city}</p>
                          {addr.phone && <p className="text-sm text-brand-muted">{addr.phone}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-brand-muted">No tenés direcciones guardadas.</p>
                  )}
                </div>
              )}

              {/* DETALLES */}
              {section === "detalles" && (
                <div className="space-y-4">
                  <h2 className="font-heading text-xl font-bold text-brand-text">Detalles de la cuenta</h2>
                  <form onSubmit={handleSaveDetails} className="max-w-lg space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="det-fname" className="text-sm text-brand-text mb-1 block">Nombre</label>
                        <input id="det-fname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor="det-lname" className="text-sm text-brand-text mb-1 block">Apellido</label>
                        <input id="det-lname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="det-email" className="text-sm text-brand-text mb-1 block">Correo electrónico *</label>
                      <input id="det-email" type="email" required value={detailEmail} onChange={(e) => setDetailEmail(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="det-phone" className="text-sm text-brand-text mb-1 block">Teléfono</label>
                      <input id="det-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                    </div>
                    <button type="submit" className="brand-gradient focus-ring text-white rounded-[8px] h-[44px] px-8 text-sm font-semibold">
                      Guardar cambios
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
