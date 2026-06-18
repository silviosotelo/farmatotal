"use client";

import { useEffect, useState } from "react";
import { Render, type Config, type Data } from "@measured/puck";
import { HeroSlider } from "@/components/sections/HeroSlider";
import {
  HomeCategoriesBlock,
  HomeDealsBlock,
  HomeFeaturedBlock,
  HomePromoBannerBlock,
} from "./sectionBlocks";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type GridProduct = { id: string; title: string; priceWeb: number; slug: string; image: string };

type Slide = {
  id: string;
  title: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  linkHref: string | null;
};

function StoreHeroSlider() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [idx, setIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    fetch(`${API}/slides/today`)
      .then((r) => r.json())
      .then((d) => setSlides(d.data || []))
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  // Solo banners que tienen imagen para el dispositivo actual
  const visible = slides.filter((s) => (isMobile ? s.imageMobile || s.imageDesktop : s.imageDesktop || s.imageMobile));
  if (visible.length === 0) return null;
  const cur = visible[idx % visible.length];
  const img = isMobile ? cur.imageMobile || cur.imageDesktop : cur.imageDesktop || cur.imageMobile;

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
      <a href={cur.linkHref || "#"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img || ""}
          alt={cur.title}
          style={{ width: "100%", display: "block", objectFit: "cover" }}
        />
      </a>
      {visible.length > 1 && (
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
          {visible.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: i === idx % visible.length ? "#f16522" : "rgba(255,255,255,.7)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoreProductGrid({ heading, limit, source }: { heading: string; limit: number; source: string }) {
  const [items, setItems] = useState<GridProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const qs = new URLSearchParams({
      perPage: String(limit || 8),
      status: "published",
      sort: "createdAt:desc",
    });
    if (source === "featured") qs.set("featured", "true");
    else if (source === "promo" || source === "ofertas" || source === "onPromo") qs.set("onPromo", "true");
    fetch(`${API}/catalog/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        let list = (d.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: p.title as string,
          priceWeb: p.priceWeb as number,
          slug: p.slug as string,
          image:
            (p.images as { url: string }[] | undefined)?.[0]?.url ||
            "/products/no-img.webp",
        }));
        // Si "featured" no devuelve nada, caer a últimos para no dejar vacío.
        if (list.length === 0 && source === "featured") {
          return fetch(`${API}/catalog/products?perPage=${limit || 8}&status=published&sort=createdAt:desc`)
            .then((r) => r.json())
            .then((d2) => {
              list = (d2.data || []).map((p: Record<string, unknown>) => ({
                id: p.id as string,
                title: p.title as string,
                priceWeb: p.priceWeb as number,
                slug: p.slug as string,
                image: (p.images as { url: string }[] | undefined)?.[0]?.url || "/products/no-img.webp",
              }));
              setItems(list);
              setLoaded(true);
            });
        }
        setItems(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [heading, limit, source]);

  const gs = (n: number) => "₲ " + (n ?? 0).toLocaleString("es-PY").replace(/,/g, ".");

  if (loaded && items.length === 0) return null;

  return (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 24, margin: "8px 0" }}>{heading}</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
          gap: 12,
        }}
      >
        {items.map((p) => (
          <a
            key={p.id}
            href={`/productos/${p.slug}/`}
            style={{
              border: "1px solid #ededf1",
              borderRadius: 10,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
            }}
          >
            <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.title} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.3 }}>{p.title}</div>
            <div style={{ color: "#f16522", fontWeight: 700, marginTop: 4 }}>{gs(p.priceWeb)}</div>
          </a>
        ))}
        {!loaded && <p style={{ color: "#9ca3af" }}>Cargando productos…</p>}
      </div>
    </div>
  );
}

/**
 * Config de RENDER del store — debe reflejar los mismos componentes que el
 * builder del admin (apps/admin/src/components/puck/puckConfig.tsx).
 * Solo render (sin fields), porque acá no se edita.
 */
const config: Config = {
  components: {
    Hero: {
      render: ({ title, subtitle, image, ctaText, ctaHref, align }) => (
        <div
          style={{
            position: "relative",
            padding: "64px 32px",
            borderRadius: 16,
            overflow: "hidden",
            background: image
              ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${image}) center/cover`
              : "linear-gradient(135deg,#f16522,#ff8a4c)",
            color: "#fff",
            textAlign: (align as "left" | "center") ?? "center",
          }}
        >
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>{title as string}</h1>
          <p style={{ fontSize: 18, marginTop: 12, opacity: 0.95 }}>{subtitle as string}</p>
          {(ctaText as string) && (
            <a
              href={ctaHref as string}
              style={{
                display: "inline-block",
                marginTop: 20,
                background: "#fff",
                color: "#f16522",
                padding: "12px 28px",
                borderRadius: 30,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {ctaText as string}
            </a>
          )}
        </div>
      ),
    },
    Heading: {
      render: ({ text, level }) => {
        const Tag = ((level as string) || "h2") as "h1" | "h2" | "h3";
        const size = level === "h1" ? 36 : level === "h2" ? 28 : 22;
        return <Tag style={{ fontWeight: 700, fontSize: size, margin: "8px 0" }}>{text as string}</Tag>;
      },
    },
    Text: {
      render: ({ text }) => (
        <p style={{ lineHeight: 1.6, margin: "8px 0", color: "#374151" }}>{text as string}</p>
      ),
    },
    ImageBlock: {
      render: ({ src, alt, rounded }) => (
        <>
          {(src as string) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src as string}
              alt={(alt as string) || ""}
              style={{ maxWidth: "100%", borderRadius: rounded ? 12 : 0 }}
            />
          ) : null}
        </>
      ),
    },
    Button: {
      render: ({ label, href, variant }) => (
        <a
          href={href as string}
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: 30,
            fontWeight: 600,
            textDecoration: "none",
            background: variant === "solid" ? "#f16522" : "transparent",
            color: variant === "solid" ? "#fff" : "#f16522",
            border: "2px solid #f16522",
          }}
        >
          {label as string}
        </a>
      ),
    },
    Banner: {
      render: ({ text, bg, color }) => (
        <div
          style={{
            background: bg as string,
            color: color as string,
            padding: "12px 20px",
            textAlign: "center",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          {text as string}
        </div>
      ),
    },
    Columns: {
      render: ({ columns, puck }) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${(columns as { count: string })?.count ?? "3"}, 1fr)`,
            gap: 16,
          }}
        >
          {(puck as { renderDropZone?: (a: { zone: string }) => React.ReactNode })?.renderDropZone?.({
            zone: "cols",
          })}
        </div>
      ),
    },
    ProductGrid: {
      render: ({ heading, limit, source }) => (
        <StoreProductGrid
          heading={(heading as string) ?? "Productos"}
          limit={(limit as number) ?? 8}
          source={(source as string) ?? "featured"}
        />
      ),
    },
    Features: {
      render: ({ items }) => {
        const arr = (items as { icon: string; title: string; text: string }[]) ?? [];
        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(arr.length || 1, 4)},1fr)`, gap: 16 }}>
            {arr.map((it, i) => (
              <div key={i} style={{ textAlign: "center", padding: 20, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ fontSize: 36 }}>{it.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>{it.title}</div>
                <div style={{ color: "#6b7280", fontSize: 14 }}>{it.text}</div>
              </div>
            ))}
          </div>
        );
      },
    },
    FAQ: {
      render: ({ items }) => {
        const arr = (items as { q: string; a: string }[]) ?? [];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {arr.map((it, i) => (
              <details key={i} style={{ border: "1px solid #eee", borderRadius: 10, padding: "12px 16px" }}>
                <summary style={{ fontWeight: 600, cursor: "pointer" }}>{it.q}</summary>
                <p style={{ marginTop: 8, color: "#374151" }}>{it.a}</p>
              </details>
            ))}
          </div>
        );
      },
    },
    CTA: {
      render: ({ title, text, buttonText, buttonHref }) => (
        <div style={{ textAlign: "center", padding: 48, borderRadius: 16, background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>{title as string}</h2>
          <p style={{ marginTop: 8, opacity: 0.95 }}>{text as string}</p>
          <a href={buttonHref as string} style={{ display: "inline-block", marginTop: 16, background: "#fff", color: "#2563eb", padding: "12px 28px", borderRadius: 30, fontWeight: 700, textDecoration: "none" }}>
            {buttonText as string}
          </a>
        </div>
      ),
    },
    Testimonials: {
      render: ({ items }) => {
        const arr = (items as { name: string; text: string }[]) ?? [];
        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(arr.length || 1, 3)},1fr)`, gap: 16 }}>
            {arr.map((it, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, background: "#f9fafb" }}>
                <p style={{ fontStyle: "italic", color: "#374151" }}>“{it.text}”</p>
                <div style={{ fontWeight: 700, marginTop: 8 }}>— {it.name}</div>
              </div>
            ))}
          </div>
        );
      },
    },
    BranchMap: {
      render: ({ heading }) => (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 24 }}>{heading as string}</h3>
          <div style={{ background: "#eef2ff", borderRadius: 12, padding: 40, textAlign: "center", color: "#6366f1" }}>
            🗺️ Mapa de sucursales
          </div>
        </div>
      ),
    },
    HeroSlider: {
      render: () => <StoreHeroSlider />,
    },
    // Secciones reales del home como bloques (diseño exacto + data del backend)
    HomeSlider: {
      render: () => <HeroSlider />,
    },
    HomeCategories: {
      render: () => <HomeCategoriesBlock />,
    },
    HomeDeals: {
      render: ({ limit }) => <HomeDealsBlock limit={(limit as number) ?? 12} />,
    },
    HomeFeatured: {
      render: ({ limit }) => <HomeFeaturedBlock limit={(limit as number) ?? 8} />,
    },
    HomePromoBanner: {
      render: ({ index }) => <HomePromoBannerBlock index={(index as number) ?? 0} />,
    },
    Spacer: {
      render: ({ size }) => <div style={{ height: (size as number) ?? 32 }} />,
    },
  },
};

export default function PuckRender({ data }: { data: Data }) {
  return <Render config={config} data={data} />;
}
