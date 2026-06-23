"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input, Button, Select, Alert, Radio, Spinner } from "@platform/ui";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
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

type SelOpt = { value: string; label: string };
type FieldRole = "name" | "firstName" | "lastName" | "email" | "phone" | "city" | "address" | "";
type Field = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "city" | "department" | "location";
  required: boolean;
  width: "full" | "half";
  enabled?: boolean;
  role?: FieldRole;
  options?: string[];
};

const DEFAULT_FIELDS: Field[] = [
  { key: "firstName", label: "Nombre", type: "text", width: "half", required: true, enabled: true, role: "firstName" },
  { key: "lastName", label: "Apellido", type: "text", width: "half", required: false, enabled: true, role: "lastName" },
  { key: "email", label: "Email", type: "email", width: "half", required: true, enabled: true, role: "email" },
  { key: "phone", label: "Teléfono", type: "tel", width: "half", required: false, enabled: true, role: "phone" },
  { key: "department", label: "Departamento", type: "department", width: "half", required: false, enabled: true },
  { key: "city", label: "Ciudad", type: "city", width: "half", required: false, enabled: true, role: "city" },
  { key: "address", label: "Dirección", type: "text", width: "full", required: false, enabled: true, role: "address" },
  { key: "location", label: "Ubicación exacta de entrega", type: "location", width: "full", required: false, enabled: true },
];

const CheckoutMap = dynamic(() => import("./CheckoutMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-search-bg gap-2">
      <Spinner size="md" />
      <span className="text-sm text-brand-muted">Cargando mapa…</span>
    </div>
  ),
});

const LABEL_CLS = "block text-sm font-medium text-brand-text mb-1";
const SECTION_CLS = "rounded-xl border border-[#ededf1] bg-white p-6";
const BILLING_ROLES: FieldRole[] = ["name", "firstName", "lastName", "email", "phone", "city", "address"];

const PAY_NOTICE: Record<string, string> = {
  rechazado: "Tu pago fue rechazado. Revisá los datos de la tarjeta o probá con otra y volvé a intentar.",
  cancelado: "Cancelaste el pago. Tu carrito sigue acá: podés reintentar cuando quieras.",
  pendiente: "No pudimos confirmar tu pago a tiempo. Si ya se debitó, te contactaremos; podés reintentar.",
  error: "Hubo un inconveniente al procesar el pago. Intentá de nuevo.",
};

export function CheckoutBlock() {
  const money = useMoney();
  const router = useRouter();
  const searchParams = useSearchParams();
  const payNotice = PAY_NOTICE[searchParams.get("pago") ?? ""] ?? "";
  const { lines, subtotal, coupon, discount, total, clear } = useCart();
  const { selected } = useSucursal();
  const { toast } = useToast();
  const flags = useFlags();

  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS);
  const [values, setValues] = useState<Record<string, string>>({});
  const setVal = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  const [submitting, setSubmitting] = useState(false);

  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [branches, setBranches] = useState<Sucursal[]>([]);

  const departamentos = useMemo(() => departmentsOf(branches), [branches]);
  const deptField = fields.find((f) => f.type === "department");
  const deptValue = deptField ? values[deptField.key] ?? "" : "";
  const ciudades = useMemo(
    () => (deptValue ? zonasOf(branches).filter((c) => departmentOf(c) === deptValue) : zonasOf(branches)),
    [branches, deptValue],
  );

  const enabledFields = fields.filter((f) => f.enabled !== false);
  const byRole = (r: FieldRole) => enabledFields.find((f) => f.role === r);
  const locField = enabledFields.find((f) => f.type === "location");
  const requiresShipping = lines.some((l) => (l.product.productType ?? "physical") === "physical");

  const ship = useShippingQuote({ enabled: requiresShipping, city: values[byRole("city")?.key ?? "city"] ?? "", subtotal });
  const taxCfg = useTaxConfig();
  const paymentMethods = usePaymentMethods();
  const rate = defaultRate(taxCfg);
  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null;
  const isPickup = selectedShip?.type === "pickup";

  const payOptions = (paymentMethods ?? []).filter((m) => m.enabled);
  const [paymentKey, setPaymentKey] = useState("");
  useEffect(() => {
    if (payOptions.length === 0) return;
    setPaymentKey((prev) => (payOptions.some((o) => o.key === prev) ? prev : payOptions[0].key));
  }, [paymentMethods]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSucursales().then(setBranches);
    fetch(`${API}/cms/settings/mod_checkout`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const f = (d?.value?.fields ?? []) as Field[];
        if (Array.isArray(f) && f.length) setFields(f.filter((x) => x?.key && x?.label));
      })
      .catch(() => {});
    try {
      const raw = localStorage.getItem(GEO_KEY);
      if (raw) setLoc(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!selected?.zona) return;
    const cityF = fields.find((f) => f.type === "city");
    const deptF = fields.find((f) => f.type === "department");
    setValues((s) => {
      const next = { ...s };
      if (cityF && !s[cityF.key]) next[cityF.key] = selected.zona.trim();
      if (deptF && !s[deptF.key]) next[deptF.key] = departmentOf(selected.zona);
      return next;
    });
  }, [selected, fields]);

  function persistLoc(p: { lat: number; lng: number } | null) {
    setLoc(p);
    try { if (p) localStorage.setItem(GEO_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }

  function locate() {
    if (!("geolocation" in navigator)) { setGeoMsg("Tu navegador no permite geolocalización."); return; }
    setGeoMsg("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => { persistLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoMsg("Ubicación marcada. Arrastrá el pin para ajustar."); },
      () => setGeoMsg("No pudimos obtener tu ubicación. Marcá el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (lines.length === 0) {
    return (
      <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
        <p className="text-brand-muted text-lg">Tu carrito está vacío.</p>
        <Link href="/catalogo" className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center">Ver catálogo</Link>
      </div>
    );
  }

  function buildBilling() {
    const v = (r: FieldRole) => { const f = byRole(r); return f ? (values[f.key] ?? "").trim() : ""; };
    const name = v("name") || `${v("firstName")} ${v("lastName")}`.trim();
    return { name, email: v("email"), phone: v("phone"), address: v("address"), city: v("city") };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const billing = buildBilling();
    if (!billing.name || !billing.email) { toast("Completá al menos nombre y email.", "error"); return; }
    const missing = enabledFields.find((f) => f.required && f.type !== "location" && !(values[f.key]?.trim()));
    if (missing) { toast(`Completá: ${missing.label}`, "error"); return; }
    if (locField?.required && requiresShipping && !isPickup && !loc) {
      toast(`Marcá tu ${locField.label.toLowerCase()} en el mapa`, "error"); return;
    }
    setSubmitting(true);
    try {
      const chosen = payOptions.find((o) => o.key === paymentKey);
      const paymentMethod = paymentKey === "bancard" ? "online" : "contraentrega";
      const shippingMethod = requiresShipping && !isPickup ? "delivery" : "pickup";
      const customFields: Record<string, string> = {};
      for (const f of enabledFields) {
        if (BILLING_ROLES.includes(f.role ?? "")) continue;
        const val = values[f.key]?.trim();
        if (val) customFields[f.key] = val;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map(({ product, quantity }) => ({ productId: product.variantOf ?? product.id, sku: product.sku, title: product.title, quantity, unitPrice: product.priceWeb })),
          couponCode: coupon?.code,
          paymentMethod, paymentKey, paymentLabel: chosen?.name,
          shippingMethod,
          shippingMethodId: shippingMethod === "delivery" ? (ship.selectedId ?? undefined) : undefined,
          taxRateId: rate?.id,
          branchId: flags.branches && shippingMethod === "pickup" ? selected?.branchId : undefined,
          location: locField && shippingMethod === "delivery" ? loc ?? undefined : undefined,
          customFields: Object.keys(customFields).length ? customFields : undefined,
          billing,
        }),
      });
      if (!res.ok) { const data = await res.json(); toast(data.error ?? "Error al crear el pedido", "error"); setSubmitting(false); return; }
      const order = await res.json();
      try {
        localStorage.setItem("ft_last_order_v1", JSON.stringify({ id: order.number, date: new Date().toISOString(), status: order.status, total: order.total, sucursal: isPickup ? selected?.name : undefined, paymentMethod: chosen?.name, lines: lines.map(({ product, quantity }) => ({ title: product.title, sku: product.sku, quantity, price: product.priceWeb, image: product.image })) }));
      } catch { /* ignore */ }
      if (paymentMethod === "online") { window.location.href = `/pago/${order.id}`; return; }
      clear();
      router.push("/pedido-recibido");
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(f: Field) {
    if (f.type === "location") return null;
    const id = `f-${f.key}`;
    const val = values[f.key] ?? "";
    const common = { id, value: val };
    let control;
    if (f.type === "department") {
      control = (
        <Select
          inputId={id}
          value={val ? { value: val, label: val } : null}
          onChange={(opt) => {
            const v = (opt as SelOpt | null)?.value ?? "";
            setVal(f.key, v);
            const cityF = fields.find((x) => x.type === "city");
            if (cityF) setVal(cityF.key, "");
          }}
          options={departamentos.map((d) => ({ value: d, label: d }))}
          placeholder="Elegí un departamento"
          isClearable
        />
      );
    } else if (f.type === "city") {
      control = (
        <Select
          inputId={id}
          value={val ? { value: val, label: val } : null}
          onChange={(opt) => setVal(f.key, (opt as SelOpt | null)?.value ?? "")}
          options={ciudades.map((c) => ({ value: c, label: c }))}
          placeholder="Elegí una ciudad"
          isClearable
        />
      );
    } else if (f.type === "textarea") {
      control = <Input textArea {...common} className="resize-y" rows={3} onChange={(e) => setVal(f.key, e.target.value)} />;
    } else if (f.type === "select") {
      control = (
        <Select
          inputId={id}
          value={val ? { value: val, label: val } : null}
          onChange={(opt) => setVal(f.key, (opt as SelOpt | null)?.value ?? "")}
          options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
          placeholder="Elegí una opción"
          isClearable
        />
      );
    } else {
      control = <Input {...common} type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} onChange={(e) => setVal(f.key, e.target.value)} />;
    }
    return (
      <div key={f.key} className={f.width === "full" || f.type === "textarea" ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className={LABEL_CLS}>{f.label} {f.required ? <span className="text-[#c0392b]">*</span> : null}</label>
        {control}
      </div>
    );
  }

  const shippingCost = requiresShipping ? (selectedShip?.cost ?? 0) : 0;
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true;
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0;
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount);

  return (
    <div className="ft-container py-8">
      <h2 className="font-heading text-2xl text-brand-text mb-6">Finalizar compra</h2>
      {payNotice ? (
        <Alert type="warning" showIcon className="mb-6">
          {payNotice}
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Datos de facturación</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enabledFields.map(renderField)}
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
                  <Radio.Group value={ship.selectedId ?? ""} onChange={(val) => ship.setSelectedId(String(val))}>
                    <div className="flex flex-col gap-3">
                      {ship.options.map((o) => (
                        <div
                          key={o.id}
                          className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (ship.selectedId === o.id ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}
                        >
                          <Radio value={o.id} />
                          <span className="flex-1 text-sm font-medium text-brand-text">{o.name}</span>
                          <span className="font-price text-sm text-brand-text whitespace-nowrap">{o.cost > 0 ? money(o.cost) : "Gratis"}</span>
                        </div>
                      ))}
                    </div>
                  </Radio.Group>
                  {isPickup ? (
                    <div className="mt-4 text-sm text-brand-text">
                      {selected ? <span>Retirás en <span className="font-semibold">{selected.name}</span>{selected.address ? <span className="text-brand-muted"> — {selected.address}</span> : null}</span> : <span className="text-brand-muted">Elegí tu sucursal para retirar tu pedido.</span>}
                    </div>
                  ) : locField ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-brand-text">{locField.label} {locField.required ? <span className="text-[#c0392b]">*</span> : null}</span>
                        <Button
                          type="button"
                          variant="default"
                          shape="round"
                          size="md"
                          className="border-brand-orange text-brand-orange-ink hover:bg-brand-orange hover:text-white px-3"
                          onClick={locate}
                        >
                          Usar mi ubicación
                        </Button>
                      </div>
                      <div className="h-[300px] overflow-hidden rounded-lg border border-[#ededf1]">
                        <CheckoutMap value={loc} onChange={(lat, lng) => persistLoc({ lat, lng })} />
                      </div>
                      <p className="mt-1 text-xs text-brand-muted">{geoMsg || "Tocá el mapa o arrastrá el pin para marcar tu dirección exacta."}{loc ? ` (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})` : ""}</p>
                    </div>
                  ) : null}
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
                <Radio.Group value={paymentKey} onChange={(val) => setPaymentKey(String(val))}>
                  <div className="flex flex-col gap-3">
                    {payOptions.map((o) => (
                      <div
                        key={o.key}
                        className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (paymentKey === o.key ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}
                      >
                        <Radio value={o.key} />
                        <span className="text-sm font-medium text-brand-text">{o.name}</span>
                      </div>
                    ))}
                  </div>
                </Radio.Group>
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
                <div className="flex justify-between"><dt className="text-brand-muted">Subtotal</dt><dd className="font-price text-brand-text">{money(subtotal)}</dd></div>
                {coupon && discount > 0 && (<div className="flex justify-between text-[#c0392b]"><dt>Descuento ({coupon.code})</dt><dd className="font-price">−{money(discount)}</dd></div>)}
                {requiresShipping && (<div className="flex justify-between"><dt className="text-brand-muted">Envío{selectedShip ? ` (${selectedShip.name})` : ""}</dt><dd className="font-price text-brand-text">{selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "—"}</dd></div>)}
                {rate && taxAmount > 0 && (<div className="flex justify-between"><dt className="text-brand-muted">{taxIncluded ? `${rate.name} incluido` : rate.name}</dt><dd className="font-price text-brand-text">{money(taxAmount)}</dd></div>)}
                <div className="pt-3 border-t border-[#ededf1] flex justify-between items-baseline"><dt className="font-semibold text-brand-text text-base">Total</dt><dd className="font-price text-brand-orange text-xl font-bold">{money(grandTotal)}</dd></div>
              </dl>
              <Button
                type="submit"
                variant="solid"
                shape="round"
                loading={submitting}
                disabled={submitting}
                block
                className="mt-6 brand-gradient h-11"
              >
                {submitting ? "Procesando..." : "Realizar pedido"}
              </Button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
