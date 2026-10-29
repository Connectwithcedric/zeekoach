"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Location } from "@/lib/data";

const pin = (active: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    html: `<svg viewBox="0 0 24 32" width="30" height="40"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="${active ? "#3d8bff" : "#7a7a85"}"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
  });

const priceTag = (label: string) =>
  L.divIcon({
    className: "",
    iconSize: [44, 26],
    iconAnchor: [22, 34],
    html: `<span style="display:flex;align-items:center;justify-content:center;height:26px;border-radius:6px;background:#3d8bff;color:#fff;font:700 11px var(--font-jakarta),sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.2)">${label}</span>`,
  });

function FlyTo({ loc }: { loc?: Location }) {
  const map = useMap();
  useEffect(() => {
    if (loc) map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [loc, map]);
  return null;
}

export default function LeafletMap({
  locations,
  prices,
  selected,
  onSelect,
}: {
  locations: Location[];
  prices: { id: string; label: string; loc: Location }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={[44.807, 20.455]} zoom={13} zoomControl={false} className="size-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {locations.map((l) => (
        <Marker key={l.id} position={[l.lat, l.lng]} icon={pin(l.id === selected)} eventHandlers={{ click: () => onSelect(l.id) }} />
      ))}
      {prices.map((p, i) => (
        // Offset each price tag a little so tags at the same location don't stack.
        <Marker key={p.id} position={[p.loc.lat + 0.004 + (i % 3) * 0.002, p.loc.lng + ((i % 2) - 0.5) * 0.008]} icon={priceTag(p.label)} eventHandlers={{ click: () => onSelect(p.loc.id) }} />
      ))}
      <FlyTo loc={locations.find((l) => l.id === selected)} />
    </MapContainer>
  );
}
