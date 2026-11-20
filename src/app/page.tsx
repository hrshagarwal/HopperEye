"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AREAS, BEAT_COLOURS, demoHotspots, demoLanes, loadArea, wardScore, type AreaKey, type RouteStats, type StreetCollection } from "@/lib/ward";

import IntroBand from "@/components/IntroBand";

const WardMap = dynamic(() => import("@/components/WardMap"), { ssr: false });

type Loaded = Awaited<ReturnType<typeof loadArea>>;

function Tag({ kind }: { kind: "real" | "demo" }) {
  return kind === "real" ? (
    <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-lime">REAL DATA</span>
  ) : (
    <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber">DEMO DATA</span>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "lime" | "teal" | "pink" | "amber" }) {
  const colour = { lime: "text-lime glow-lime", teal: "text-teal glow-teal", pink: "text-pink glow-pink", amber: "text-amber glow-amber" }[tone];
  return (
    <div className={`rounded-2xl bg-panel/80 p-4 ${colour.split(" ")[1]}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-display text-2xl font-bold sm:text-3xl ${colour.split(" ")[0]}`}>{value}</div>
      <div className="text-xs text-text/80">{sub}</div>
    </div>
  );
}

export default function Command() {
  const [area, setArea] = useState<AreaKey>("kardhani");
  const [data, setData] = useState<Loaded | null>(null);
  const [beat, setBeat] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    setBeat(null);
    loadArea(area).then(setData);
  }, [area]);

  const stats: RouteStats | undefined = data?.stats;
  const streets: StreetCollection | undefined = data?.streets;
  const lanes = useMemo(() => (streets ? demoLanes(streets, area === "kardhani" ? 44 : 600) : []), [streets, area]);
  const hotspots = useMemo(() => (streets ? demoHotspots(streets, area === "kardhani" ? 7 : 11) : []), [streets, area]);
  const ward = wardScore(lanes);
  const shownLanes = beat === null ? lanes : lanes.filter((l) => l.beat === beat);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 overflow-x-hidden p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">
            HOPPER<span className="text-lime">EYE</span> <span className="text-muted">COMMAND</span>
          </h1>
          <p className="text-sm text-muted">Every garbage hopper becomes a sensor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <Link href="/radar" className="rounded-full bg-pink px-4 py-1.5 text-sm font-bold text-night">Dump-spot radar →</Link>
        <Link href="/collector" className="rounded-full bg-lime px-4 py-1.5 text-sm font-bold text-night">Collector app →</Link>
        <div className="flex max-w-full gap-1 rounded-full bg-panel p-1 md:gap-2">
          {(Object.keys(AREAS) as AreaKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setArea(k)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition md:px-4 md:text-sm ${area === k ? "bg-lime text-night" : "text-muted hover:text-text"}`}
            >
              {AREAS[k].label} · {AREAS[k].city}
            </button>
          ))}
        </div>
        </div>
      </header>

      <IntroBand />

      <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div id="map" className="relative h-[60vh] min-h-[360px] scroll-mt-4 overflow-hidden rounded-2xl glow-teal lg:h-auto lg:min-h-[520px]">
          {data && stats ? (
            <WardMap streets={data.streets} depots={data.depots} hotspots={hotspots} centre={stats.centre} activeBeat={beat} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">Loading ward graph…</div>
          )}
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-[500] flex flex-wrap gap-2">
            <Tag kind="real" />
            <span className="rounded-full bg-night/80 px-2 py-0.5 text-[10px] text-muted">streets & beats: route engine on OpenStreetMap</span>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-24 z-[500] flex flex-wrap gap-2">
            <Tag kind="demo" />
            <span className="rounded-full bg-night/80 px-2 py-0.5 text-[10px] text-muted">pulsing pins: dump-spot alerts</span>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Ward segregation" value={`${ward.score}%`} sub="demo data" tone="lime" />
            <Kpi label="Dump spots open" value={`${hotspots.length}`} sub="demo data" tone="pink" />
            <Kpi label="Streets covered" value={stats ? `${stats.L_streets.toFixed(1)} km` : "…"} sub="real · OSM" tone="teal" />
            <Kpi label="Route efficiency" value={stats ? `${(stats.efficiency * 100).toFixed(0)}%` : "…"} sub={stats ? `+${stats.deadhead.toFixed(1)} km repeat driving` : ""} tone="amber" />
          </div>

          <div className="rounded-2xl bg-panel/80 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wider text-teal">BEATS</h2>
              <Tag kind="real" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBeat(null)} className={`rounded-full px-3 py-1 text-xs ${beat === null ? "bg-text text-night" : "bg-night text-muted"}`}>
                All
              </button>
              {stats?.beat_len.map((km, i) => (
                <button
                  key={i}
                  onClick={() => setBeat(i)}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: beat === i ? BEAT_COLOURS[i] : "#0b1220", color: beat === i ? "#0b1220" : BEAT_COLOURS[i], border: `1px solid ${BEAT_COLOURS[i]}` }}
                >
                  Beat {i + 1} · {km.toFixed(1)} km
                </button>
              ))}
            </div>
            {stats && (
              <p className="mt-3 text-xs text-muted">
                {stats.n_odd} odd junctions paired (Chinese postman) → one tour covers every street with {stats.deadhead.toFixed(1)} km of repeat driving.
              </p>
            )}
          </div>

          <div className="flex-1 rounded-2xl bg-panel/80 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wider text-lime">LANE LEADERBOARD</h2>
              <Tag kind="demo" />
            </div>
            <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {shownLanes.slice(0, 40).map((l) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_96px_32px] items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_120px_32px]">
                  <span className="truncate">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: BEAT_COLOURS[l.beat] }} />
                    {l.name}
                  </span>
                  <span className="h-2 rounded-full bg-night">
                    <span className="block h-2 rounded-full" style={{ width: `${l.score}%`, background: l.score >= 70 ? "#d9ff43" : l.score >= 50 ? "#ffb547" : "#ff5fa2" }} />
                  </span>
                  <span className="text-right font-semibold">{l.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <footer className="text-xs text-muted">
        HopperEye prototype. Streets, beats and route statistics are computed from OpenStreetMap; segregation
        scores and dump-spot pins are simulated demo data until field capture.
      </footer>
    </main>
  );
}
