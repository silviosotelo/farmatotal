"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { Sucursal } from "@/lib/sucursales";

/** Pin como divIcon (evita el 404 de los marcadores por defecto de Leaflet). */
function pin(color: string, big = false): L.DivIcon {
  const s = big ? 30 : 22;
  return L.divIcon({
    className: "",
    html: `<div style="width:${s}px;height:${s}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s],
    popupAnchor: [0, -s],
  });
}

function FitBounds({ points, active }: { points: [number, number][]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active || points.length === 0) return;
    map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
  }, [points, active, map]);
  return null;
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 0.8 });
  }, [pos, map]);
  return null;
}

export type MapBranch = Pick<Sucursal, "id" | "name" | "address" | "zona" | "lat" | "lng" | "phone">;

export default function BranchesMap({
  branches,
  nearestId,
  selectedId,
  userPos,
  flyTo,
  onSelect,
}: {
  branches: MapBranch[];
  nearestId?: string | null;
  selectedId?: string | null;
  userPos?: [number, number] | null;
  flyTo?: [number, number] | null;
  onSelect?: (id: string) => void;
}) {
  const withCoords = useMemo(() => branches.filter((b) => b.lat && b.lng), [branches]);
  const points = useMemo(() => withCoords.map((b) => [b.lat, b.lng] as [number, number]), [withCoords]);
  const center: [number, number] = points[0] ?? [-25.2867, -57.3333];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} active={!flyTo} />
      <FlyTo pos={flyTo ?? null} />
      {withCoords.map((b) => {
        const isNearest = b.id === nearestId;
        const isSel = b.id === selectedId;
        return (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={pin(isNearest ? "#16a34a" : isSel ? "#1f2937" : "var(--brand-orange)", isNearest || isSel)}
            eventHandlers={{ click: () => onSelect?.(b.id) }}
          >
            <Popup>
              <strong>{b.name}</strong>
              <br />
              {b.address}
              {b.zona ? `, ${b.zona}` : ""}
              {b.phone ? (
                <>
                  <br />
                  {b.phone}
                </>
              ) : null}
              {isNearest ? (
                <>
                  <br />
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>Más cercana</span>
                </>
              ) : null}
            </Popup>
          </Marker>
        );
      })}
      {userPos ? (
        <Marker position={userPos} icon={pin("#2563eb", true)}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
