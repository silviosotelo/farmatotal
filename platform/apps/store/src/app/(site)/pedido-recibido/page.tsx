"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatGs } from "@/lib/data";
import type { Order } from "@/types";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width="80"
      height="80"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="38" fill="#27ae60" />
      <path
        d="M22 41 L34 53 L58 27"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PedidoRecibidoPage() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ft_last_order_v1");
      setOrder(raw ? (JSON.parse(raw) as Order) : null);
    } catch {
      setOrder(null);
    }
  }, []);

  // Still hydrating
  if (order === undefined) {
    return <main className="flex-1" />;
  }

  /* ── Not found ── */
  if (order === null) {
    return (
      <main className="flex-1">
        <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
          <p className="text-brand-muted text-lg">No encontramos tu pedido.</p>
          <Link
            href="/catalogo"
            className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
          >
            Ver catálogo
          </Link>
        </div>
      </main>
    );
  }

  /* ── Success ── */
  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Pedido recibido" }]} />

      <div className="ft-container py-10 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4 mb-8">
          <CheckIcon />
          <h1 className="font-heading text-2xl text-brand-text">¡Gracias por tu compra!</h1>
          <p className="text-brand-muted text-sm">
            Tu pedido fue recibido y está siendo procesado.
          </p>
        </div>

        {/* Order meta */}
        <div className="rounded-xl border border-[#ededf1] bg-white p-6 mb-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-brand-muted mb-0.5">Número de pedido</dt>
              <dd className="font-semibold text-brand-text">{order.id}</dd>
            </div>
            <div>
              <dt className="text-brand-muted mb-0.5">Fecha</dt>
              <dd className="font-semibold text-brand-text">{formatDate(order.date)}</dd>
            </div>
            {order.paymentMethod && (
              <div>
                <dt className="text-brand-muted mb-0.5">Método de pago</dt>
                <dd className="font-semibold text-brand-text">{order.paymentMethod}</dd>
              </div>
            )}
            {order.sucursal && (
              <div>
                <dt className="text-brand-muted mb-0.5">Sucursal de retiro</dt>
                <dd className="font-semibold text-brand-text">{order.sucursal}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Lines table */}
        <div className="rounded-xl border border-[#ededf1] bg-white overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-[#f8f8f8] border-b border-[#ededf1]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Producto
                </th>
                <th className="text-center px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Cant.
                </th>
                <th className="text-right px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededf1]">
              {order.lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {line.image && (
                        <div className="relative size-10 flex-none border border-[#ededf1] rounded-md overflow-hidden bg-white">
                          <Image
                            src={line.image}
                            alt={line.title}
                            fill
                            sizes="40px"
                            className="object-contain p-0.5"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-brand-text leading-snug">{line.title}</p>
                        {line.sku && (
                          <p className="text-xs text-brand-muted mt-0.5">SKU: {line.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-brand-text">{line.quantity}</td>
                  <td className="px-4 py-3 text-right font-price text-brand-text whitespace-nowrap">
                    {formatGs(line.price * line.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#ededf1] bg-[#f8f8f8]">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right font-semibold text-brand-text">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-price text-brand-orange font-bold text-base whitespace-nowrap">
                  {formatGs(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/catalogo"
            className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center flex-1"
          >
            Seguir comprando
          </Link>
          <Link
            href="/mi-cuenta"
            className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center flex-1 hover:border-brand-orange hover:text-brand-orange transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </main>
  );
}
