"use client";

import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { BEAT_COLOURS, type StreetCollection, type Hotspot } from "@/lib/ward";

type Props = {
  streets: StreetCollection;
  depots: { features: { geometry: { coordinates: [number, number] }; properties: { beat: number } }[] };
  hotspots: Hotspot[];
  centre: [number, number];
  activeBeat: number | null;
};

function Recentre({ centre }: { centre: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centre, 16);
  }, [centre, map]);
  return null;
}

const hotspotIcon = L.divIcon({ className: "", html: '<div class="hotspot"></div>', iconSize: [14, 14] });
const depotIcon = (c: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:#f2f5f7;border:3px solid ${c};box-shadow:0 0 10px ${c}"></div>`,
    iconSize: [12, 12],
  });

export default function WardMap({ streets, depots, hotspots, centre, activeBeat }: Props) {
  return (
    <MapContainer center={centre} zoom={16} scrollWheelZoom className="h-full w-full rounded-2xl" zoomControl={false}>
      <Recentre centre={centre} />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="dark-tiles"
      />
      <GeoJSON
        key={`${centre.join(",")}-${activeBeat}`}
        data={streets as unknown as GeoJSON.FeatureCollection}
        style={(f) => {
          const beat = (f?.properties as { beat: number }).beat;
          const dim = activeBeat !== null && beat !== activeBeat;
          return { color: BEAT_COLOURS[beat % BEAT_COLOURS.length], weight: dim ? 2 : 3.5, opacity: dim ? 0.18 : 0.95 };
        }}
      />
      {depots.features.map((d, i) => (
        <Marker key={i} position={[d.geometry.coordinates[1], d.geometry.coordinates[0]]} icon={depotIcon(BEAT_COLOURS[d.properties.beat])}>
          <Tooltip>Beat {d.properties.beat + 1} start</Tooltip>
        </Marker>
      ))}
      {hotspots.map((h) => (
        <Marker key={h.id} position={[h.lat, h.lng]} icon={hotspotIcon}>
          <Tooltip>
            Dump spot · seen {h.days} day{h.days > 1 ? "s" : ""} · {(h.confidence * 100).toFixed(0)}% (demo)
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
