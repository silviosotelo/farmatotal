"use client";

import { useMemo, useState } from "react";
import { Button } from "@platform/ui";
import { LocationIcon } from "@/components/icons";
import { useToast } from "@/components/providers/ToastContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { cn } from "@/lib/utils";

export function SucursalesList() {
  const { toast } = useToast();
  const { sucursales, zonas, nearest } = useSucursal();
  const flags = useFlags();
  const [zona, setZona] = useState<string>("Todas");
  const [nearestId, setNearestId] = useState<string | null>(null);

  const list = useMemo(() => {
    const base = zona === "Todas" ? sucursales : sucursales.filter((s) => s.zona === zona);
    if (!nearestId) return base;
    return [...base].sort((a, b) => (a.id === nearestId ? -1 : b.id === nearestId ? 1 : 0));
  }, [zona, nearestId, sucursales]);

  const locate = () => {
    if (!("geolocation" in navigator)) return toast("Tu navegador no permite geolocalización", "error");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = nearest(pos.coords.latitude, pos.coords.longitude);
        if (!n) return toast("No se encontró una sucursal cercana", "error");
        setNearestId(n.id);
        setZona("Todas");
        toast(`Sucursal más cercana: ${n.name}`);
      },
      () => toast("No se pudo obtener tu ubicación", "error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!flags.branches) {
    return (
      <p className="text-sm text-brand-muted">La selección de sucursales no está disponible.</p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold text-brand-text">Encontrá tu sucursal</h2>
        <Button
          type="button"
          variant="plain"
          onClick={locate}
          style={{ borderRadius: '9999px', padding: '8px 16px', height: 'auto', fontSize: '14px', fontWeight: 500 }}
          className="inline-flex items-center gap-2 border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white"
        >
          <LocationIcon className="size-4" /> Usar mi ubicación
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["Todas", ...zonas].map((z) => (
          <Button
            key={z}
            type="button"
            variant="plain"
            onClick={() => setZona(z)}
            style={{ borderRadius: '9999px', padding: '4px 12px', height: 'auto', fontSize: '14px', fontWeight: 500, lineHeight: '1.5' }}
            className={zona === z ? "bg-brand-orange text-white border border-brand-orange" : "bg-[#f3f4f7] text-[#202435] border border-[#ededf1] hover:bg-[#e7e8ee]"}
          >
            {z}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <div key={s.id} className="card-shadow relative flex gap-3 rounded-[10px] border border-[#ededf1] bg-white p-4">
            {nearestId === s.id && (
              <span className="absolute right-3 top-3 rounded bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                Más cercana
              </span>
            )}
            <LocationIcon className="mt-0.5 size-6 shrink-0 text-brand-orange" />
            <div>
              <h3 className="font-medium text-brand-text">{s.name}</h3>
              <p className="mt-0.5 text-sm text-brand-muted">{s.address}</p>
              <span className="mt-2 inline-block rounded bg-search-bg px-2 py-0.5 text-xs text-brand-muted">{s.zona}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
