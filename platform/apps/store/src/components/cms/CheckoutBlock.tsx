"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { formatQty, unitLabel } from "@/lib/units";
import { fetchSucursales, zonasOf, departmentsOf, departmentOf, type Sucursal } from "@/lib/sucursales";
import { useShippingQuote, useTaxConfig, usePaymentMethods, defaultRate, computeTax } from "@/lib/checkout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const GEO_KEY = "ft_geo";

const CheckoutMap = dynamic(() => import("./CheckoutMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-search-bg text-sm text-brand-muted">Cargando mapa…</div>,
});

type CustomField = { key: string; label: string; type?: string; required?: boolean; options?: string[]; width?: "full" | "half" };

const INPUT_CLS =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40 text-brand-text placeholder:text-brand-muted";
const LABEL_CLS = "block text-sm font-medium text-brand-text mb-1";
const SECTION_CLS = "rounded-xl border border-[#ededf1] bg-white p-6";

export function CheckoutBlock() {
  const money = useMoney();
  const router = useRouter();
  const { lines, subtotal, coupon, discount, total, clear } = useCart();
  const { selected } = useSucursal();
  const { toast } = useToast();
  const flags = useFlags();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ubicación exacta (mapa) — persistida en localStorage (no cookies).
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");

  // Sucursales: fuente de ciudades/departamentos para los selects (branch-derived).
  const [branches, setBranches] = useState<Sucursal[]>([]);
  const departamentos = useMemo(() => departmentsOf(branches), [branches]);
  const ciudades = useMemo(
    () => (departamento ? zonasOf(branches).filter((c) => departmentOf(c) === departamento) : zonasOf(branches)),
    [branches, departamento],
  );

  // Campos custom (config del tenant, con layout width).
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});

  const requiresShipping = lines.some((l) => (l.product.productType ?? "physical") === "physical");

  // Envío: ÚNICA fuente = /shipping/quote (retiro gratis + delivery 12.000). Se
  // cotiza siempre (no gateado por un selector aparte); el comportamiento sale del
  // `type` del método elegido.
  const ship = useShippingQuote({ enabled: requiresShipping, city: ciudad, subtotal });
  const taxCfg = useTaxConfig();
  const paymentMethods = usePaymentMethods();
  const rate = defaultRate(taxCfg);
  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null;
  const isPickup = selectedShip?.type === "pickup";

  // Pago dinámico (incluye custom; oculta los deshabilitados).
  const payOptions = (paymentMethods ?? []).filter((m) => m.enabled);
  const [paymentKey, setPaymentKey] = useState("");
  useEffect(() => {
    if (payOptions.length === 0) return;
    setPaymentKey((prev) => (payOptions.some((o) => o.key === prev) ? prev : payOptions[0].key));
  }, [paymentMethods]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial: sucursales, campos custom, ubicación guardada.
  useEffect(() => {
    fetchSucursales().then(setBranches);
    fetch(`${API}/cms/settings/mod_checkout`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const f = (d?.value?.fields ?? []) as CustomField[];
        if (Array.isArray(f)) setCustomFields(f.filter((x) => x?.key && x?.label));
      })
      .catch(() => {});
    try {
      const raw = localStorage.getItem(GEO_KEY);
      if (raw) setLoc(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Precarga ciudad/departamento desde la sucursal elegida (branch-derived).
  useEffect(() => {
    if (selected?.zona && !ciudad) {
      setCiudad(selected.zona.trim());
      setDepartamento(departmentOf(selected.zona));
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  function persistLoc(p: { lat: number; lng: number } | null) {
    setLoc(p);
    try {
      if (p) localStorage.setItem(GEO_KEY, JSON.stringify(p));
    } catch { /* ignore */ }
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Tu navegador no permite geolocalización.");
      return;
    }
    setGeoMsg("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persistLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoMsg("Ubicación marcada. Podés arrastrar el pin para ajustar.");
      },
      () => setGeoMsg("No pudimos obtener tu ubicación. Marcá el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (lines.length === 0) {
    return (
      <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
        <p className="text-brand-muted text-lg">Tu carrito está vacío.</p>
        <Link href="/catalogo" className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center">
          Ver catálogo
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      toast("Completá al menos tu nombre y email.", "error");
      return;
    }
    const missing = customFields.find((f) => f.required && !customVals[f.key]?.trim());
    if (missing) {
      toast(`Completá: ${missing.label}`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const chosen = payOptions.find((o) => o.key === paymentKey);
      const paymentMethod = paymentKey === "bancard" ? "online" : "contraentrega";
      const shippingMethod = requiresShipping && !isPickup ? "delivery" : "pickup";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map(({ product, quantity }) => ({
            productId: product.variantOf ?? product.id,
            sku: product.sku,
            title: product.title,
            quantity,
            unitPrice: product.priceWeb,
          })),
          couponCode: coupon?.code,
          paymentMethod,
          paymentKey,
          paymentLabel: chosen?.name,
          shippingMethod,
          shippingMethodId: shippingMethod === "delivery" ? (ship.selectedId ?? undefined) : undefined,
          taxRateId: rate?.id,
          branchId: flags.branches && shippingMethod === "pickup" ? selected?.branchId : undefined,
          location: shippingMethod === "delivery" ? loc ?? undefined : undefined,
          customFields: Object.keys(customVals).length ? customVals : undefined,
          billing: { name: `${nombre} ${apellido}`.trim(), email, phone: telefono, address: direccion, city: ciudad },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Error al crear el pedido", "error");
        setSubmitting(false);
        return;
      }
      const order = await res.json();
      try {
        localStorage.setItem("ft_last_order_v1", JSON.stringify({
          id: order.number, date: new Date().toISOString(), status: order.status, total: order.total,
          sucursal: isPickup ? selected?.name : undefined, paymentMethod: chosen?.name,
          lines: lines.map(({ product, quantity }) => ({ title: product.title, sku: product.sku, quantity, price: product.priceWeb, image: product.image })),
        }));
      } catch { /* ignore */ }
      clear();
      if (paymentMethod === "online") {
        window.location.href = `/pago/${order.id}`;
        return;
      }
      router.push("/pedido-recibido");
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const shippingCost = requiresShipping ? (selectedShip?.cost ?? 0) : 0;
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true;
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0;
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount);

  const sel = INPUT_CLS;

  return (
    <div className="ft-container py-8">
      <h2 className="font-heading text-2xl text-brand-text mb-6">Finalizar compra</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Datos de facturación</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre" className={LABEL_CLS}>Nombre <span className="text-[#c0392b]">*</span></label>
                  <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" required className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="apellido" className={LABEL_CLS}>Apellido</label>
                  <input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="email" className={LABEL_CLS}>Email <span className="text-[#c0392b]">*</span></label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="telefono" className={LABEL_CLS}>Teléfono</label>
                  <input id="telefono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0981 000 000" className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="departamento" className={LABEL_CLS}>Departamento</label>
                  <select id="departamento" value={departamento} onChange={(e) => { setDepartamento(e.target.value); setCiudad(""); }} className={sel}>
                    <option value="">Elegí un departamento</option>
                    {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ciudad" className={LABEL_CLS}>Ciudad</label>
                  <select id="ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={sel}>
                    <option value="">Elegí una ciudad</option>
                    {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="direccion" className={LABEL_CLS}>Dirección</label>
                  <input id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Mariscal López 1234" className={INPUT_CLS} />
                </div>
                {customFields.map((f) => (
                  <div key={f.key} className={f.width === "full" || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label htmlFor={`cf-${f.key}`} className={LABEL_CLS}>
                      {f.label} {f.required ? <span className="text-[#c0392b]">*</span> : null}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea id={`cf-${f.key}`} value={customVals[f.key] ?? ""} onChange={(e) => setCustomVals((v) => ({ ...v, [f.key]: e.target.value }))} className={INPUT_CLS + " h-auto py-2 resize-y"} rows={3} />
                    ) : f.type === "select" && f.options?.length ? (
                      <select id={`cf-${f.key}`} value={customVals[f.key] ?? ""} onChange={(e) => setCustomVals((v) => ({ ...v, [f.key]: e.target.value }))} className={sel}>
                        <option value="">Elegí una opción</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input id={`cf-${f.key}`} value={customVals[f.key] ?? ""} onChange={(e) => setCustomVals((v) => ({ ...v, [f.key]: e.target.value }))} className={INPUT_CLS} />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Entrega</h3>
              {!requiresShipping ? (
                <p className="text-sm text-brand-muted">Este pedido no requiere envío</p>
              ) : ship.loading ? (
                <p className="text-sm text-brand-muted">Cargando métodos de entrega…</p>
              ) : ship.options.length === 0 ? (
                <p className="text-sm text-brand-muted">No hay métodos de entrega configurados.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {ship.options.map((o) => (
                      <label key={o.id} className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (ship.selectedId === o.id ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}>
                        <input type="radio" name="shipMethod" value={o.id} checked={ship.selectedId === o.id} onChange={() => ship.setSelectedId(o.id)} className="accent-brand-orange" />
                        <span className="flex-1 text-sm font-medium text-brand-text">{o.name}</span>
                        <span className="font-price text-sm text-brand-text whitespace-nowrap">{o.cost > 0 ? money(o.cost) : "Gratis"}</span>
                      </label>
                    ))}
                  </div>

                  {isPickup ? (
                    <div className="mt-4 text-sm text-brand-text">
                      {selected ? (
                        <span>Retirás en <span className="font-semibold">{selected.name}</span>{selected.address ? <span className="text-brand-muted"> — {selected.address}</span> : null}</span>
                      ) : (
                        <span className="text-brand-muted">Elegí tu sucursal para retirar tu pedido.</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-brand-text">Ubicación exacta de entrega</span>
                        <button type="button" onClick={locate} className="rounded-[30px] border border-brand-orange px-3 py-1.5 text-xs font-semibold text-brand-orange-ink transition hover:bg-brand-orange hover:text-white">
                          Usar mi ubicación
                        </button>
                      </div>
                      <div className="h-[300px] overflow-hidden rounded-lg border border-[#ededf1]">
                        <CheckoutMap value={loc} onChange={(lat, lng) => persistLoc({ lat, lng })} />
                      </div>
                      <p className="mt-1 text-xs text-brand-muted">
                        {geoMsg || "Tocá el mapa o arrastrá el pin para marcar tu dirección exacta."}
                        {loc ? ` (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})` : ""}
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Método de pago</h3>
              {paymentMethods === null ? (
                <p className="text-sm text-brand-muted">Cargando medios de pago…</p>
              ) : payOptions.length === 0 ? (
                <p className="text-sm text-brand-muted">No hay medios de pago configurados.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {payOptions.map((o) => (
                    <label key={o.key} className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (paymentKey === o.key ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}>
                      <input type="radio" name="payment" value={o.key} checked={paymentKey === o.key} onChange={() => setPaymentKey(o.key)} className="accent-brand-orange" />
                      <span className="text-sm font-medium text-brand-text">{o.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:w-80 flex-none">
            <div className="border border-[#ededf1] rounded-xl p-6 bg-white sticky top-24">
              <h3 className="font-heading text-lg text-brand-text mb-5">Resumen del pedido</h3>
              <ul className="divide-y divide-[#ededf1] mb-5">
                {lines.map(({ product, quantity }) => (
                  <li key={product.id} className="py-3 flex items-center gap-3">
                    <div className="relative size-12 flex-none border border-[#ededf1] rounded-md overflow-hidden bg-white">
                      <Image src={product.image} alt={product.title} fill sizes="48px" className="object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-text line-clamp-2">{product.title}</p>
                      <p className="text-xs text-brand-muted mt-0.5">×{formatQty(quantity)} {unitLabel(product)}</p>
                    </div>
                    <p className="font-price text-xs text-brand-text whitespace-nowrap">{money(product.priceWeb * quantity)}</p>
                  </li>
                ))}
              </ul>
              <dl className="space-y-3 text-sm border-t border-[#ededf1] pt-4">
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Subtotal</dt>
                  <dd className="font-price text-brand-text">{money(subtotal)}</dd>
                </div>
                {coupon && discount > 0 && (
                  <div className="flex justify-between text-[#c0392b]">
                    <dt>Descuento ({coupon.code})</dt>
                    <dd className="font-price">−{money(discount)}</dd>
                  </div>
                )}
                {requiresShipping && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Envío{selectedShip ? ` (${selectedShip.name})` : ""}</dt>
                    <dd className="font-price text-brand-text">{selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "—"}</dd>
                  </div>
                )}
                {rate && taxAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">{taxIncluded ? `${rate.name} incluido` : rate.name}</dt>
                    <dd className="font-price text-brand-text">{money(taxAmount)}</dd>
                  </div>
                )}
                <div className="pt-3 border-t border-[#ededf1] flex justify-between items-baseline">
                  <dt className="font-semibold text-brand-text text-base">Total</dt>
                  <dd className="font-price text-brand-orange text-xl font-bold">{money(grandTotal)}</dd>
                </div>
              </dl>
              <button type="submit" disabled={submitting} className="mt-6 w-full brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center disabled:opacity-60">
                {submitting ? "Procesando..." : "Realizar pedido"}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
