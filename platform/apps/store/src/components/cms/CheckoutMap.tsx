"use client";

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--brand-orange);border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  const last = useRef<string>("");
  useEffect(() => {
    if (!pos) return;
    const key = pos.join(",");
    if (key === last.current) return;
    last.current = key;
    map.setView(pos, Math.max(map.getZoom(), 15), { animate: true });
  }, [pos, map]);
  return null;
}

/**
 * Selector de ubicación exacta para el envío: marcador arrastrable + click en el mapa
 * para reubicar. La geolocalización ("usar mi ubicación") la dispara el padre seteando
 * `value`. Default: Asunción. Devuelve lat/lng vía onChange.
 */
export default function CheckoutMap({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = useMemo(
    () => (value ? [value.lat, value.lng] : [-25.2867, -57.3333]),
    [value],
  );
  return (
    <MapContainer center={center} zoom={value ? 15 : 12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace onPick={onChange} />
      <Recenter pos={value ? [value.lat, value.lng] : null} />
      {value ? (
        <Marker
          position={[value.lat, value.lng]}
          icon={pin}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
