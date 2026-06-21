"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import {
  fetchSucursales,
  zonasOf,
  departmentOf,
  departmentsOf,
  haversineKm,
  type Sucursal,
} from "@/lib/sucursales";

// Leaflet toca window → debe cargarse solo en cliente (ssr:false). Permitido porque
// este bloque es "use client".
const BranchesMap = dynamic(() => import("./BranchesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-search-bg text-sm text-brand-muted">
      Cargando mapa…
    </div>
  ),
});

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

  // Ciudades disponibles según el departamento elegido (selects encadenados).
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
    return filtered.filter((s) => s.lat && s.lng)[0]?.id ?? null; // ya ordenado por distancia
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

  const ctrl =
    "h-11 w-full rounded-md border border-[#ededf1] bg-white px-3 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40";

  return (
    <section className={className || "ft-container py-8"}>
      <h1 className="font-heading text-2xl font-bold text-brand-text">Nuestras sucursales</h1>
      <p className="mt-1 text-sm text-brand-muted">
        {all.length} sucursales · filtrá por dirección, ciudad o departamento, o encontrá la más cercana a vos.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Filtros + listado */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-[12px] border border-[#ededf1] bg-white p-4">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o dirección…"
              className={ctrl}
              aria-label="Buscar sucursal"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={dept}
                onChange={(e) => {
                  setDept(e.target.value);
                  setCity("Todas");
                }}
                className={ctrl}
                aria-label="Departamento"
              >
                <option value="Todos">Departamento</option>
                {depts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select value={city} onChange={(e) => setCity(e.target.value)} className={ctrl} aria-label="Ciudad">
                <option value="Todas">Ciudad</option>
                {citiesForDept.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={locate}
              disabled={geo.status === "locating"}
              className="flex h-11 items-center justify-center gap-2 rounded-[30px] border border-brand-orange px-4 text-sm font-semibold text-brand-orange-ink transition hover:bg-brand-orange hover:text-white disabled:opacity-60"
            >
              {geo.status === "locating" ? "Obteniendo tu ubicación…" : "Usar mi ubicación"}
            </button>
            {geo.msg ? (
              <p className={`text-xs ${geo.status === "error" ? "text-[#c0392b]" : "text-brand-muted"}`}>{geo.msg}</p>
            ) : null}
          </div>

          <ul className="flex max-h-[520px] flex-col divide-y divide-[#ededf1] overflow-y-auto rounded-[12px] border border-[#ededf1] bg-white">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-brand-muted">No hay sucursales para ese filtro.</li>
            ) : (
              filtered.map((s) => {
                const dist = userPos ? haversineKm(userPos[0], userPos[1], s.lat, s.lng) : null;
                const isNearest = s.id === nearestId;
                const isSel = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className={
                        "flex w-full items-start gap-3 p-4 text-left transition hover:bg-search-bg " +
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
                            <span className="shrink-0 rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[11px] font-semibold text-[#16a34a]">
                              Más cercana
                            </span>
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
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Mapa */}
        <div className="h-[400px] overflow-hidden rounded-[12px] border border-[#ededf1] lg:h-[600px]">
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
