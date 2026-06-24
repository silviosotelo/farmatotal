"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Input, Button, Select, Tag } from "@platform/ui";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import {
  fetchSucursales,
  zonasOf,
  departmentOf,
  departmentsOf,
  haversineKm,
  type Sucursal,
} from "@/lib/sucursales";

const BranchesMap = dynamic(() => import("./BranchesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-search-bg text-sm text-brand-muted">
      Cargando mapa…
    </div>
  ),
});

type SelOpt = { value: string; label: string };
type Geo = { status: "idle" | "locating" | "ok" | "error"; msg?: string };

export function BranchesBlock({ className }: { className?: string } = {}) {
  const flags = useFlags();
  const [all, setAll] = useState<Sucursal[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Todas");
  const [dept, setDept] = useState("Todos");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geo, setGeo] = useState<Geo>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!flags.branches) return;
    fetchSucursales().then(setAll);
  }, [flags.branches]);

  const cities = useMemo(() => zonasOf(all), [all]);
  const depts = useMemo(() => departmentsOf(all), [all]);

  const citiesForDept = useMemo(
    () => (dept === "Todos" ? cities : cities.filter((c) => departmentOf(c) === dept)),
    [cities, dept],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = all.filter((s) => {
      if (dept !== "Todos" && departmentOf(s.zona) !== dept) return false;
      if (city !== "Todas" && s.zona.trim() !== city) return false;
      if (needle && !`${s.name} ${s.address} ${s.zona}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (userPos) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(userPos[0], userPos[1], a.lat, a.lng) -
          haversineKm(userPos[0], userPos[1], b.lat, b.lng),
      );
    }
    return list;
  }, [all, q, city, dept, userPos]);

  const nearestId = useMemo(() => {
    if (!userPos) return null;
    return filtered.filter((s) => s.lat && s.lng)[0]?.id ?? null;
  }, [filtered, userPos]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", msg: "Tu navegador no permite geolocalización." });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setFlyTo(p);
        setGeo({ status: "ok", msg: "Ordenado por cercanía a tu ubicación." });
      },
      () => setGeo({ status: "error", msg: "No pudimos obtener tu ubicación. Revisá los permisos." }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function pick(s: Sucursal) {
    setSelectedId(s.id);
    if (s.lat && s.lng) setFlyTo([s.lat, s.lng]);
  }

  if (!flags.branches) return null;

  const deptOptions: SelOpt[] = depts.map((d) => ({ value: d, label: d }));
  const cityOptions: SelOpt[] = citiesForDept.map((c) => ({ value: c, label: c }));

  return (
    <section className={className || "ft-container py-8"}>
      <h1 className="font-heading text-2xl font-bold text-brand-text">Nuestras sucursales</h1>
      <p className="mt-1 text-sm text-brand-muted">
        {all.length} sucursales · filtrá por dirección, ciudad o departamento, o encontrá la más cercana a vos.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Filtros + listado */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-[12px] border border-brand-border bg-white p-4">
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o dirección…"
              aria-label="Buscar sucursal"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={dept !== "Todos" ? { value: dept, label: dept } : null}
                onChange={(opt) => {
                  setDept((opt as SelOpt | null)?.value ?? "Todos");
                  setCity("Todas");
                }}
                options={deptOptions}
                placeholder="Departamento"
                isClearable
                aria-label="Departamento"
              />
              <Select
                value={city !== "Todas" ? { value: city, label: city } : null}
                onChange={(opt) => setCity((opt as SelOpt | null)?.value ?? "Todas")}
                options={cityOptions}
                placeholder="Ciudad"
                isClearable
                aria-label="Ciudad"
              />
            </div>
            <Button
              type="button"
              variant="plain"
              block
              loading={geo.status === "locating"}
              disabled={geo.status === "locating"}
              style={{ borderRadius: '9999px', padding: '10px 16px', height: 'auto', fontSize: '14px', fontWeight: 500 }}
              className="border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white w-full"
              onClick={locate}
            >
              {geo.status === "locating" ? "Obteniendo tu ubicación…" : "Usar mi ubicación"}
            </Button>
            {geo.msg ? (
              <p className={`text-xs ${geo.status === "error" ? "text-[#c0392b]" : "text-brand-muted"}`}>
                {geo.msg}
              </p>
            ) : null}
          </div>

          <ul className="flex max-h-[520px] flex-col divide-y divide-brand-border overflow-y-auto rounded-[12px] border border-brand-border bg-white">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-brand-muted">No hay sucursales para ese filtro.</li>
            ) : (
              filtered.map((s) => {
                const dist = userPos ? haversineKm(userPos[0], userPos[1], s.lat, s.lng) : null;
                const isNearest = s.id === nearestId;
                const isSel = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <Button
                      type="button"
                      variant="plain"
                      block
                      onClick={() => pick(s)}
                      style={{ height: "auto" }}
                      className={
                        "flex w-full items-start gap-3 p-4 text-left transition hover:bg-search-bg rounded-none " +
                        (isSel ? "bg-search-bg" : "")
                      }
                    >
                      <span
                        className={"mt-1 size-2.5 shrink-0 rounded-full " + (isNearest ? "bg-[#16a34a]" : "bg-brand-orange")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-brand-text">{s.name}</span>
                          {isNearest ? (
                            <Tag className="shrink-0 rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[11px] font-semibold text-[#16a34a]">
                              Más cercana
                            </Tag>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-brand-muted">
                          {s.address}
                          {s.zona ? ` · ${s.zona}` : ""}
                          {s.phone ? ` · ${s.phone}` : ""}
                        </span>
                        {dist != null ? (
                          <span className="mt-1 block text-xs font-medium text-brand-orange-ink">
                            a {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Mapa — isolation:isolate evita que los z-index de Leaflet (~800) escapen al header */}
        <div className="relative z-[0] h-[400px] overflow-hidden rounded-[12px] border border-brand-border lg:h-[600px]">
          <BranchesMap
            branches={filtered}
            nearestId={nearestId}
            selectedId={selectedId}
            userPos={userPos}
            flyTo={flyTo}
            onSelect={(id) => {
              const s = filtered.find((b) => b.id === id);
              if (s) pick(s);
            }}
          />
        </div>
      </div>
    </section>
  );
}
