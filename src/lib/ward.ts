// Ward data: real route-engine output (streets, beats, stats) + clearly-labelled demo scores.

export type AreaKey = "kardhani" | "saidapet";

export const AREAS: Record<AreaKey, { label: string; city: string; households: number | null }> = {
  kardhani: { label: "Kardhani, Ward 44", city: "Jaipur", households: 3135 }, // Swachhtam Portal 2024
  saidapet: { label: "Saidapet", city: "Chennai", households: null },
};

export const BEAT_COLOURS = ["#d9ff43", "#2ee6d6", "#ff5fa2", "#ffb547", "#4da3ff"];

export type StreetFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: { beat: number; length_m: number; name: string };
};
export type StreetCollection = { type: "FeatureCollection"; features: StreetFeature[] };

export type RouteStats = {
  name: string;
  centre: [number, number];
  radius_m: number;
  L_streets: number;
  n_nodes: number;
  n_odd: number;
  deadhead: number;
  route_len: number;
  efficiency: number;
  beat_len: number[];
};

export async function loadArea(key: AreaKey) {
  const [streets, depots, stats] = await Promise.all([
    fetch(`/geo/${key}_streets.geojson`).then((r) => r.json()) as Promise<StreetCollection>,
    fetch(`/geo/${key}_depots.geojson`).then((r) => r.json()),
    fetch(`/geo/${key}_stats.json`).then((r) => r.json()) as Promise<RouteStats>,
  ]);
  return { streets, depots, stats };
}

// ---------------------------------------------------------------- demo data (deterministic)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Lane = { id: string; name: string; beat: number; km: number; houses: number; score: number };
export type Hotspot = { id: string; lat: number; lng: number; days: number; confidence: number };

const HH_PER_KM = 3135 / 31.6; // Kardhani field study: households per km of street

export function demoLanes(streets: StreetCollection, seed = 44): Lane[] {
  const r = rng(seed);
  const byName = new Map<string, { beat: number; m: number }>();
  streets.features.forEach((f, i) => {
    const key = f.properties.name && f.properties.name !== "nan" ? f.properties.name : `Lane ${f.properties.beat + 1}-${Math.floor(i / 12) + 1}`;
    const cur = byName.get(key) ?? { beat: f.properties.beat, m: 0 };
    cur.m += f.properties.length_m;
    byName.set(key, cur);
  });
  return [...byName.entries()]
    .filter(([, v]) => v.m > 150)
    .map(([name, v], i) => {
      const base = 35 + r() * 55;
      return {
        id: `L${i}`,
        name: name.length > 26 ? name.slice(0, 24) + "…" : name,
        beat: v.beat,
        km: v.m / 1000,
        houses: Math.max(4, Math.round((v.m / 1000) * HH_PER_KM)),
        score: Math.round(base),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function demoHotspots(streets: StreetCollection, seed = 7, n = 5): Hotspot[] {
  const r = rng(seed);
  const out: Hotspot[] = [];
  for (let k = 0; k < n; k++) {
    const f = streets.features[Math.floor(r() * streets.features.length)];
    const c = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
    out.push({ id: `H${k}`, lat: c[1], lng: c[0], days: 1 + Math.floor(r() * 6), confidence: 0.7 + r() * 0.28 });
  }
  return out;
}

export function wardScore(lanes: Lane[]) {
  const houses = lanes.reduce((a, l) => a + l.houses, 0);
  const weighted = lanes.reduce((a, l) => a + l.score * l.houses, 0);
  return { houses, score: houses ? Math.round(weighted / houses) : 0 };
}
