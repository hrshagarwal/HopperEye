"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gridScan, segregationScore, type Bin, type TileResult } from "@/lib/binsorter";

const SAMPLES = [
  { src: "/samples/mixed_bin_collage.jpg", label: "Mixed bin (demo collage)" },
  { src: "/samples/kardhani_mixed.jpg", label: "Kardhani heap (hard case)" },
  { src: "/samples/banana.jpg", label: "Kitchen waste" },
  { src: "/samples/bottle.jpg", label: "Plastic bottle" },

];
const BIN_COLOUR: Record<Bin, string> = { green: "#3DDC84", blue: "#4DA3FF", red: "#FF5A5A" };
const BIN_NAME: Record<Bin, string> = { green: "wet (green)", blue: "dry (blue)", red: "hazardous (red)" };

function tip(wrong: [string, number][], declared: Bin) {
  if (!wrong.length) return "Perfect segregation today. Keep it up!";
  const top = wrong[0][0].replace("-", " ");
  return `Please keep ${top} out of the ${BIN_NAME[declared].split(" ")[0]} bin. It belongs in the ${declared === "green" ? "blue" : "green"} bin.`;
}

export default function Collector() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState(SAMPLES[0].src);
  const [declared, setDeclared] = useState<Bin>("green");
  const [tiles, setTiles] = useState<TileResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // ?auto=1 scores the sample as soon as the page is ready (for demos and screenshots)
    if (!new URLSearchParams(window.location.search).has("auto")) return;
    const img = imgRef.current;
    if (!img) return;
    const go = () => run();
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener("load", go, { once: true });
  }, []);

  async function run() {
    if (!imgRef.current) return;
    setBusy(true);
    setErr(null);
    try {
      setTiles(await gridScan(imgRef.current, 3));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const result = tiles ? segregationScore(tiles, declared) : null;
  const ring = result ? (result.score >= 70 ? "#D9FF43" : result.score >= 50 ? "#FFB547" : "#FF5FA2") : "#24304A";

  return (
    <main className="mx-auto flex min-h-screen max-w-[1300px] flex-col gap-5 overflow-x-hidden p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-wide">
            HOPPER<span className="text-lime">EYE</span> <span className="text-muted">COLLECTOR</span>
          </h1>
          <p className="text-sm text-muted">One photo at pickup scores the bin.</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-full bg-panel px-4 py-1.5 text-sm text-teal hover:text-text">
            ← Ward command
          </Link>
          <Link href="/radar" className="rounded-full bg-panel px-4 py-1.5 text-sm text-pink hover:text-text">
            Dump-spot radar
          </Link>
        </nav>
      </header>

      <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)_340px]">
        {/* phone */}
        <div className="mx-auto w-full max-w-[360px] rounded-[36px] border-4 border-[#3A4458] bg-[#141A28] p-3 shadow-2xl sm:rounded-[42px] sm:p-4">
          <div className="mx-auto mb-3 h-5 w-28 rounded-full bg-night" />
          <div className="mb-2 text-lg font-bold">House 44-B/117</div>
          <div className="mb-3 text-xs text-muted">Lane 7 · Beat 3 · QR scanned</div>
          <div className="relative overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="bin photo" className="block aspect-square w-full object-cover" crossOrigin="anonymous" onLoad={() => setTiles(null)} />
            {tiles && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {tiles.map((t) => (
                  <div
                    key={`${t.row}-${t.col}`}
                    className="flex items-end justify-start p-1"
                    style={{ border: `2px solid ${t.conf >= 0.35 ? BIN_COLOUR[t.bin] : "#9AA7B8"}`, background: `${BIN_COLOUR[t.bin]}${t.bin !== declared && t.conf >= 0.35 ? "40" : "10"}` }}
                  >
                    <span className="rounded bg-night/85 px-1 text-[10px] font-semibold" style={{ color: BIN_COLOUR[t.bin] }}>
                      {t.cls} {(t.conf * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            {(["green", "blue"] as Bin[]).map((b) => (
              <button
                key={b}
                onClick={() => setDeclared(b)}
                className="flex-1 rounded-full px-1 py-1.5 font-semibold leading-tight"
                style={{ background: declared === b ? BIN_COLOUR[b] : "#0B1220", color: declared === b ? "#0B1220" : BIN_COLOUR[b], border: `1px solid ${BIN_COLOUR[b]}` }}
              >
                This is the {BIN_NAME[b]} bin
              </button>
            ))}
          </div>
          <button onClick={run} disabled={busy} className="mt-3 w-full rounded-2xl bg-lime py-3 font-bold text-night disabled:opacity-60">
            {busy ? "Scanning 9 tiles…" : "Score this bin"}
          </button>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: ring }}>
            <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(${ring} ${(result?.score ?? 0) * 3.6}deg, #24304A 0)` }}>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-night text-2xl font-black">{result ? result.score : "–"}</div>
            </div>
            <div className="text-sm">
              <div className="font-bold" style={{ color: ring }}>
                {result ? (result.score >= 70 ? "SEGREGATED" : result.score >= 50 ? "PARTLY MIXED" : "MIXED") : "Not scored yet"}
              </div>
              {result?.wrong.slice(0, 3).map(([cls, n]) => (
                <div key={cls} className="text-xs text-muted">
                  {n} × {cls} in the {BIN_NAME[declared].split(" ")[0]} bin
                </div>
              ))}
            </div>
          </div>
          {err && <div className="mt-2 text-xs text-pink">{err}</div>}
        </div>

        {/* explainer + samples */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl bg-panel/80 p-4 glow-teal sm:p-5">
            <h2 className="mb-2 font-display text-sm tracking-wider text-teal">HOW THIS SCORE IS COMPUTED</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-text/90">
              <li>The bin photo is cut into a 3 × 3 grid.</li>
              <li>Each tile runs through our bin-sorter model (MobileNetV2, 98.9 % correct bin on 1,526 unseen photos) right here in your browser.</li>
              <li>Tiles the model is unsure about (&lt; 35 %) are ignored.</li>
              <li>S = 100 × (1 − c), where c is the confidence-weighted share of tiles that belong in a different bin from the one declared.</li>
            </ol>
            <p className="mt-3 text-xs text-amber">
              Grid-scan v0. It works on close-up bin photos. On dense street heaps (try the Kardhani hard case) the single-item model is
              often wrong, which is exactly why HopperEye moves to an item-level detector trained on Indian waste.
            </p>
          </div>
          <div className="rounded-2xl bg-panel/80 p-4 sm:p-5">
            <h2 className="mb-3 font-display text-sm tracking-wider text-lime">TRY A PHOTO</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SAMPLES.map((s) => (
                <button key={s.src} onClick={() => setSrc(s.src)} className={`overflow-hidden rounded-xl border-2 text-left ${src === s.src ? "border-lime" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.label} className="aspect-square w-full object-cover" />
                  <div className="bg-night px-2 py-1 text-[11px] text-muted">{s.label}</div>
                </button>
              ))}
            </div>
            <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-line p-3 text-center text-sm text-muted hover:text-text">
              Upload your own bin photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setSrc(URL.createObjectURL(e.target.files[0]))} />
            </label>
          </div>
        </div>

        {/* WhatsApp-style score card (mock) */}
        <div className="mx-auto w-full max-w-[420px] rounded-[28px] bg-[#0B141A] p-3 shadow-2xl lg:max-w-none">
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[#1F2C34] p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#3DDC84] text-lg font-black text-night">D</div>
            <div>
              <div className="text-sm font-semibold">Dabbu · HopperEye</div>
              <div className="text-[11px] text-muted">Ward 44 segregation bot</div>
            </div>
            <span className="ml-auto rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">MOCK</span>
          </div>
          <div className="space-y-2 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%222%22 cy=%222%22 r=%221%22 fill=%22%23ffffff10%22/></svg>')] p-2">
            <div className="max-w-[90%] rounded-2xl rounded-tl-none bg-[#202C33] p-3 text-sm">
              Namaste! 🙏 Today&apos;s pickup at <b>44-B/117</b> is done.
            </div>
            <div className="max-w-[90%] rounded-2xl rounded-tl-none bg-[#202C33] p-3 text-sm">
              Your segregation score: <b style={{ color: ring }}>{result ? `${result.score}/100` : "…"}</b>
              <br />
              {result ? tip(result.wrong, declared) : "Waiting for the collector's photo."}
            </div>
            <div className="max-w-[90%] rounded-2xl rounded-tl-none bg-[#202C33] p-3 text-sm">
              Lane 7 is <b className="text-lime">#3 of 41</b> this week. 4 weeks above 80 → <b className="text-amber">₹50 off</b> your user charge. 🏆
              <div className="mt-1 text-right text-[10px] text-muted">07:12 ✓✓</div>
            </div>
          </div>
        </div>
      </section>
      <footer className="text-xs text-muted">
        Bin photos: our own Kardhani photo and public sample images. Lane rank and rebate are demo data. The model runs fully in your browser; no photo
        leaves the device.
      </footer>
    </main>
  );
}
