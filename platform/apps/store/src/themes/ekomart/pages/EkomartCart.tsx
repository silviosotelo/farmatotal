"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@platform/ui";
import { useCart } from "@/components/providers/CartContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";

export function EkomartCart() {
  const money = useMoney();
  const {
    lines,
    subtotal,
    coupon,
    discount,
    total,
    setQty,
    removeItem,
    clear,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState("");

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    const result = await applyCoupon(code);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) setCouponInput("");
  }

  if (lines.length === 0) {
    return (
      <div className="shop-page">
        <div className="rts-navigation-area-breadcrumb bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="navigator-breadcrumb-wrapper">
                  <Link href="/">Inicio</Link>
                  <i className="fa-regular fa-chevron-right" />
                  <span className="current">Carrito</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="rts-cart-area rts-section-gap bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-12 text-center py-5">
                <i className="fa-light fa-cart-shopping" style={{ fontSize: "64px", color: "var(--brand-orange)" }} />
                <h3 className="mt--30 mb--10">Tu carrito está vacío</h3>
                <p className="mb--30">Aún no agregaste productos a tu carrito.</p>
                <Link href="/catalogo" className="rts-btn btn-primary">Volver a la tienda</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Inicio</Link>
                <i className="fa-regular fa-chevron-right" />
                <span className="current">Carrito</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      <div className="rts-cart-area rts-section-gap bg_light-1">
        <div className="container">
          <div className="row g-5">
            <div className="col-xl-9 col-12 order-2 order-xl-1">
              <div className="rts-cart-list-area">
                <div className="single-cart-area-list head">
                  <div className="product-main"><p>Producto</p></div>
                  <div className="price"><p>Precio</p></div>
                  <div className="quantity"><p>Cantidad</p></div>
                  <div className="subtotal"><p>Subtotal</p></div>
                </div>

                {lines.map(({ product, quantity }) => (
                  <div className="single-cart-area-list main item-parent" key={product.id}>
                    <div className="product-main-cart">
                      <Button
                        type="button"
                        variant="plain"
                        className="close section-activation"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Quitar ${product.title}`}
                        style={{ background: "transparent", border: 0, padding: 0, lineHeight: 0, cursor: "pointer" }}
                      >
                        <i className="fa-regular fa-x" />
                      </Button>
                      <div className="thumbnail">
                        <Link href={`/productos/${product.slug}/`}>
                          <Image src={product.image} alt={product.title} width={80} height={80} sizes="80px" style={{ objectFit: "contain" }} />
                        </Link>
                      </div>
                      <div className="information">
                        <h6 className="title">
                          <Link href={`/productos/${product.slug}/`}>{product.title}</Link>
                        </h6>
                      </div>
                    </div>

                    <div className="price"><p>{money(product.priceWeb)}</p></div>

                    <div className="quantity">
                      <div className="quantity-edit">
                        <Input
                          type="text"
                          className="input"
                          value={quantity}
                          readOnly
                          aria-label="Cantidad"
                          onChange={() => {}}
                        />
                        <div className="button-wrapper-action">
                          <Button
                            type="button"
                            variant="plain"
                            className="button minus"
                            onClick={() => setQty(product.id, quantity - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            <i className="fa-regular fa-chevron-down" />
                          </Button>
                          <Button
                            type="button"
                            variant="plain"
                            className="button plus"
                            onClick={() => setQty(product.id, quantity + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            <i className="fa-regular fa-chevron-up" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="subtotal"><p>{money(product.priceWeb * quantity)}</p></div>
                  </div>
                ))}

                <div className="bottom-cupon-code-cart-area">
                  {coupon ? (
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <span className="rts-btn btn-primary">{coupon.code}</span>
                      <Button type="button" variant="plain" onClick={removeCoupon} className="rts-btn btn-primary">
                        Quitar cupón
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon}>
                      <Input
                        type="text"
                        placeholder="Código de cupón"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                      />
                      <Button type="submit" variant="plain" className="rts-btn btn-primary">
                        Aplicar cupón
                      </Button>
                    </form>
                  )}
                  <Button type="button" variant="plain" onClick={clear} className="rts-btn btn-primary mr--50">
                    Vaciar carrito
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-12 order-1 order-xl-2">
              <div className="cart-total-area-start-right">
                <h5 className="title">Total del carrito</h5>
                <div className="subtotal">
                  <span>Subtotal</span>
                  <h6 className="price">{money(subtotal)}</h6>
                </div>
                {coupon && (
                  <div className="subtotal">
                    <span>Descuento ({coupon.code})</span>
                    <h6 className="price">−{money(discount)}</h6>
                  </div>
                )}
                <div className="bottom">
                  <div className="wrapper">
                    <span>Total</span>
                    <h6 className="price">{money(total)}</h6>
                  </div>
                  <div className="button-area">
                    <Link href="/caja" className="rts-btn btn-primary">Finalizar compra</Link>
                    <Link href="/catalogo" className="rts-btn btn-primary border-only mt--10">Seguir comprando</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
