"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney, useCurrency } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { formatMoney } from "@/lib/money";
import { formatQty } from "@/lib/units";

/**
 * Bloque funcional "Mi cuenta" del builder (estilo widget de cuenta de Woo en
 * Elementor): toda la lógica real embebida; se coloca/posiciona desde el builder.
 *
 * Data-bound al API del tenant:
 *  - Datos del cliente: GET {API}/customers?q=<email> (lectura pública del backend)
 *    para resolver el registro real de `customers` por email y obtener su id; cae a
 *    los datos de la sesión (useAuth) mientras carga o si no hay match.
 *  - Pedidos: GET /api/orders (proxy autenticado del storefront → :4000/orders).
 *  - Guardar cambios: PATCH /api/customers/<id> (proxy autenticado del storefront →
 *    :4000/customers/:id). La mutación NO está whitelisteada en el backend y el JWT
 *    se lee del header Authorization (Bearer), por eso pasa por el proxy same-origin
 *    que reenvía la cookie httpOnly ft_at como Bearer — igual que /api/auth/me y
 *    /api/orders. Un fetch directo del browser a {API}/customers/:id devolvería 401.
 */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40 transition-colors";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  PENDING: "bg-gray-100 text-brand-muted",
  CANCELLED: "bg-red-100 text-red-700",
};

/** Registro de cliente del backend (subset usado por el bloque). */
interface Customer {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

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
  currency?: string;
  subtotal: number;
  discount: number;
  paymentMethod: string | null;
  shippingMethod: string | null;
  lines: OrderLine[];
  createdAt: string;
}

export function AccountBlock({
  title = "Mi cuenta",
  showProfile = true,
  showOrders = true,
}: {
  title?: string;
  showProfile?: boolean;
  showOrders?: boolean;
} = {}) {
  const { user, isLoggedIn, login, register, logout, refresh } = useAuth();
  const { toast } = useToast();
  const money = useMoney();
  const { currency, locale } = useCurrency();
  const flags = useFlags();

  /* ── Auth (login / registro) para el estado deslogueado ── */
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPwd, setAuthPwd] = useState("");
  const [authFirst, setAuthFirst] = useState("");
  const [authLast, setAuthLast] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthErr("");
    setAuthBusy(true);
    try {
      const r =
        authMode === "login"
          ? await login(authEmail.trim(), authPwd)
          : await register({ email: authEmail.trim(), password: authPwd, firstName: authFirst.trim(), lastName: authLast.trim(), phone: authPhone.trim() || undefined });
      if (!r.ok) {
        setAuthErr(r.message || "No se pudo iniciar sesión.");
      } else {
        toast(authMode === "login" ? "Sesión iniciada." : "Cuenta creada.", "success");
      }
    } catch {
      setAuthErr("Error de conexión. Intentá de nuevo.");
    } finally {
      setAuthBusy(false);
    }
  }

  /* ── Cliente real (tabla customers) ── */
  const [customer, setCustomer] = useState<Customer | null>(null);

  /* ── Formulario de detalles ── */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Pedidos ── */
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Siembra inicial del formulario desde la sesión (se refina con el registro
  // de customers cuando llega).
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  // Resuelve el registro real de `customers` por email (GET público). Da el id
  // que necesita el PATCH y los campos canónicos del cliente.
  const loadCustomer = useCallback(async (mail: string) => {
    try {
      const res = await fetch(`${API}/customers?q=${encodeURIComponent(mail)}&perPage=5`);
      if (!res.ok) return;
      const body = (await res.json()) as { data?: Customer[] };
      const match = (body.data ?? []).find(
        (c) => (c.email ?? "").toLowerCase() === mail.toLowerCase(),
      );
      if (!match) return;
      setCustomer(match);
      setFirstName(match.firstName ?? "");
      setLastName(match.lastName ?? "");
      setEmail(match.email ?? "");
      setPhone(match.phone ?? "");
    } catch {
      /* sin match → se usan los datos de la sesión */
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user?.email) loadCustomer(user.email);
  }, [isLoggedIn, user?.email, loadCustomer]);

  // Historial de pedidos del usuario (proxy autenticado).
  useEffect(() => {
    if (!isLoggedIn) {
      setOrders([]);
      return;
    }
    let alive = true;
    setOrdersLoading(true);
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (alive) setOrders(data.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setOrdersLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  // Formatea un importe de pedido: respeta la moneda guardada de la orden si
  // difiere de la del tenant; si no, usa el formateador vivo (useMoney).
  const fmtOrder = useCallback(
    (value: number, orderCurrency?: string) =>
      orderCurrency && orderCurrency !== currency
        ? formatMoney(value, { currency: orderCurrency, locale })
        : money(value),
    [currency, locale, money],
  );

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    const id = customer?.id;
    if (!id) {
      toast("No se encontró tu ficha de cliente.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      if (!res.ok) {
        toast("No se pudieron guardar los cambios.", "error");
        return;
      }
      const updated = (await res.json().catch(() => null)) as Customer | null;
      if (updated) setCustomer(updated);
      // Refresca la sesión por si cambió el nombre/email mostrados en el header.
      await refresh();
      toast("Cambios guardados", "success");
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── Invitado ── */
  if (!isLoggedIn || !user) {
    const inp =
      "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40 text-brand-text placeholder:text-brand-muted";
    return (
      <div className="ft-container py-12">
        <div className="max-w-md mx-auto border border-[#ededf1] rounded-[12px] p-8 bg-white">
          <h2 className="font-heading text-xl font-bold text-brand-text text-center">{title}</h2>
          <p className="mt-1 text-center text-sm text-brand-muted">
            {authMode === "login" ? "Iniciá sesión para ver tus datos y pedidos." : "Creá tu cuenta para comprar más rápido."}
          </p>
          <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-3" noValidate>
            {authMode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <input value={authFirst} onChange={(e) => setAuthFirst(e.target.value)} placeholder="Nombre" className={inp} aria-label="Nombre" />
                <input value={authLast} onChange={(e) => setAuthLast(e.target.value)} placeholder="Apellido" className={inp} aria-label="Apellido" />
              </div>
            )}
            <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="correo@ejemplo.com" className={inp} aria-label="Email" />
            <input type="password" required value={authPwd} onChange={(e) => setAuthPwd(e.target.value)} placeholder="Contraseña" className={inp} aria-label="Contraseña" />
            {authMode === "register" && (
              <input value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="Teléfono (opcional)" className={inp} aria-label="Teléfono" />
            )}
            {authErr ? <p className="text-xs text-[#c0392b]">{authErr}</p> : null}
            <button type="submit" disabled={authBusy} className="mt-1 brand-gradient focus-ring text-white rounded-[30px] h-11 px-8 text-sm font-semibold inline-flex items-center justify-center disabled:opacity-60">
              {authBusy ? "Procesando…" : authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setAuthMode((m) => (m === "login" ? "register" : "login")); setAuthErr(""); }}
            className="mt-4 w-full text-center text-sm text-brand-orange-ink hover:underline"
          >
            {authMode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-container py-8">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h2 className="font-heading text-2xl text-brand-text">{title}</h2>
        <p className="text-sm text-brand-muted">
          Hola, <span className="font-semibold text-brand-text">{user.firstName}</span>{" "}
          <button
            type="button"
            onClick={logout}
            className="focus-ring rounded-sm text-brand-orange-ink underline-offset-2 hover:underline"
          >
            Cerrar sesión
          </button>
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Detalles de la cuenta ── */}
        {showProfile && (
          <section className="lg:w-96 flex-none">
            <div className="border border-[#ededf1] rounded-xl p-6 bg-white">
              <h3 className="font-heading text-lg text-brand-text mb-5">Detalles de la cuenta</h3>
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="acc-fname" className="text-sm text-brand-text mb-1 block">
                      Nombre
                    </label>
                    <input
                      id="acc-fname"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-lname" className="text-sm text-brand-text mb-1 block">
                      Apellido
                    </label>
                    <input
                      id="acc-lname"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="acc-email" className="text-sm text-brand-text mb-1 block">
                    Correo electrónico *
                  </label>
                  <input
                    id="acc-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="acc-phone" className="text-sm text-brand-text mb-1 block">
                    Teléfono
                  </label>
                  <input
                    id="acc-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="brand-gradient focus-ring text-white rounded-[8px] h-[44px] px-8 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── Historial de pedidos ── */}
        {showOrders && (
          <section className="flex-1 min-w-0">
            <h3 className="font-heading text-lg text-brand-text mb-5">Mis pedidos</h3>
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
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <FragmentRow
                        key={order.id}
                        order={order}
                        expanded={expandedOrder === order.id}
                        onToggle={() =>
                          setExpandedOrder(expandedOrder === order.id ? null : order.id)
                        }
                        fmtOrder={fmtOrder}
                        locale={locale}
                        showBranchPickup={flags.branches}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** Fila de pedido + detalle expandible. */
function FragmentRow({
  order,
  expanded,
  onToggle,
  fmtOrder,
  locale,
  showBranchPickup,
}: {
  order: OrderItem;
  expanded: boolean;
  onToggle: () => void;
  fmtOrder: (value: number, orderCurrency?: string) => string;
  locale: string;
  showBranchPickup: boolean;
}) {
  const shippingLabel =
    order.shippingMethod === "pickup"
      ? showBranchPickup
        ? "Retiro en sucursal"
        : "Retiro"
      : order.shippingMethod === "delivery"
        ? "Delivery"
        : "—";

  return (
    <>
      <tr className="border-t border-[#ededf1]">
        <td className="px-4 py-3 font-medium text-brand-text">{order.number}</td>
        <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
          {new Date(order.createdAt).toLocaleDateString(locale)}
        </td>
        <td className="px-4 py-3">
          <span
            className={
              "inline-block px-2 py-0.5 rounded-full text-xs font-medium " +
              (STATUS_COLORS[order.status] ?? "bg-gray-100 text-brand-muted")
            }
          >
            {order.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-semibold text-brand-text">
          {fmtOrder(order.total, order.currency)}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="focus-ring rounded-sm text-brand-orange-ink text-xs hover:underline"
          >
            {expanded ? "Cerrar" : "Ver detalle"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-[#ededf1] bg-search-bg/50">
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-1 text-xs text-brand-muted mb-3">
              <p>
                Pago: <span className="text-brand-text">{order.paymentMethod ?? "—"}</span>
              </p>
              <p>
                Envío: <span className="text-brand-text">{shippingLabel}</span>
              </p>
            </div>
            {order.lines.length > 0 ? (
              <div className="space-y-2">
                {order.lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-brand-text text-xs">{line.title}</span>
                    <span className="text-brand-muted text-xs">x{formatQty(line.quantity)}</span>
                    <span className="font-medium text-brand-text text-xs">
                      {fmtOrder(line.subtotal, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted text-xs">Subtotal</span>
                <span className="font-medium text-brand-text text-xs">
                  {fmtOrder(order.subtotal, order.currency)}
                </span>
              </div>
            )}
            {order.discount > 0 && (
              <p className="text-xs text-red-500 mt-2">
                Descuento: -{fmtOrder(order.discount, order.currency)}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
