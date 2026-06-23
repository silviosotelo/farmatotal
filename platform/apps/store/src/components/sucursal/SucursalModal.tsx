"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Tag } from "@platform/ui";
import { type Sucursal } from "@/lib/sucursales";
import { useSucursal } from "./SucursalContext";
import { LocationIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTheme, themeAccentVars } from "@/themes/ThemeProvider";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

type GeoState = { status: "idle" | "locating" | "ok" | "error"; nearestId?: string; message?: string };

export function SucursalModal() {
  const { isOpen, close, select, selected, mandatory, sucursales, zonas, nearest } = useSucursal();
  const theme = useTheme();
  const flags = useFlags();
  const [zona, setZona] = useState<string>("Todas");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !flags.branches) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!mandatory) close();
        return;
      }
      if (e.key === "Tab") {
        const f = getFocusable();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => getFocusable()[0]?.focus());

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, close, mandatory, flags.branches]);

  const list = useMemo(
    () => (zona === "Todas" ? sucursales : sucursales.filter((s) => s.zona === zona)),
    [zona, sucursales],
  );

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Tu navegador no permite geolocalización" });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = nearest(pos.coords.latitude, pos.coords.longitude);
        if (n) {
          setGeo({ status: "ok", nearestId: n.id, message: `Tienda más cercana: ${n.name}` });
          setZona("Todas");
        } else {
          setGeo({ status: "error", message: "No se encontró una sucursal cercana" });
        }
      },
      () => setGeo({ status: "error", message: "No se pudo obtener su posición" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!isOpen || !flags.branches) return null;

  const ordered: Sucursal[] =
    geo.status === "ok" && geo.nearestId
      ? [...list].sort((a, b) => (a.id === geo.nearestId ? -1 : b.id === geo.nearestId ? 1 : 0))
      : list;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      style={themeAccentVars(theme)}
      onClick={mandatory ? undefined : close}
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar Sucursal"
    >
      <div
        ref={dialogRef}
        className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[12px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-gradient relative px-6 py-5 text-white">
          {!mandatory && (
            <Button
              type="button"
              variant="plain"
              shape="circle"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 size-7 bg-white/25 text-white hover:bg-white/40"
            >
              ×
            </Button>
          )}
          <h2 className="font-heading text-lg font-bold leading-snug">
            Bienvenido a nuestra tienda en línea.
          </h2>
          <p className="mt-1 text-sm text-white/90">
            {mandatory
              ? "Para continuar, elegí tu tienda más cercana. Verás precios y stock de esa sucursal."
              : "Por favor selecciona tu Tienda más cercana."}
          </p>
        </div>

        <div className="border-b border-[#ededf1] px-6 py-4">
          <Button
            type="button"
            variant="default"
            shape="round"
            onClick={useMyLocation}
            loading={geo.status === "locating"}
            disabled={geo.status === "locating"}
            className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white"
          >
            <LocationIcon className="size-4" />
            {geo.status === "locating" ? "Obteniendo tu ubicación..." : "Usar mi ubicación"}
          </Button>
          {geo.message && (
            <p className={cn("mt-2 text-sm", geo.status === "error" ? "text-[#e74c3c]" : "text-brand-text")}>
              {geo.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#ededf1] px-6 py-3">
          {["Todas", ...zonas].map((z) => (
            <Button
              key={z}
              type="button"
              variant={zona === z ? "solid" : "default"}
              shape="round"
              size="md"
              onClick={() => setZona(z)}
              className={zona === z ? "bg-brand-orange text-white border-brand-orange" : "bg-search-bg text-brand-text border-transparent hover:bg-[#e7e8ee]"}
            >
              {z}
            </Button>
          ))}
        </div>

        <ul className="flex-1 divide-y divide-[#ededf1] overflow-y-auto">
          {ordered.map((s) => {
            const isNearest = geo.status === "ok" && geo.nearestId === s.id;
            const isSelected = selected?.id === s.id;
            return (
              <li key={s.id}>
                <Button
                  type="button"
                  variant="plain"
                  block
                  onClick={() => select(s)}
                  className={cn(
                    "flex items-start gap-3 px-6 py-3 text-left rounded-none",
                    isSelected && "bg-[#fff4e6]",
                  )}
                >
                  <LocationIcon className="mt-0.5 size-5 shrink-0 text-brand-orange" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-brand-text">{s.name}</span>
                      {isNearest && (
                        <Tag className="rounded bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Más cercana
                        </Tag>
                      )}
                      {isSelected && <span className="text-brand-orange">✓</span>}
                    </span>
                    <span className="block text-xs text-brand-muted">{s.address}</span>
                    <span className="block text-xs text-brand-muted">{s.zona}</span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
