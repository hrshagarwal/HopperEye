"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { detect, loadDetector, type Det } from "@/lib/detector";

const FRAMES = [
  { src: "/samples/street/kd10_road_heap.jpg", label: "Kalwar Rd edge", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd2_roadside_heap.jpg", label: "Roadside by pole", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd5_roadside_point.jpg", label: "Open point", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd6_dog_heap.jpg", label: "Near hospital", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd7_buffalo_heap.jpg", label: "Roadside heap", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd8_vacant_land.jpg", label: "Vacant land", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd9_dusk_plot.jpg", label: "Empty plot, dusk", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd4_empty_plot.jpg", label: "Empty plot", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd1_park_heap.jpg", label: "Park corner", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd11_park_heap2.jpg", label: "Park, evening", place: "Kardhani · Ward 44" },
  { src: "/samples/street/kd3_cattle.jpg", label: "Cattle at heap", place: "Kardhani · Ward 44" },
  { src: "/samples/street/ch1_canal_heap.jpg", label: "Canal bank", place: "Chennai · Commons" },
];

type Info = { model?: string; data?: string; test_map50?: number; test_images?: number; kardhani_hits?: number; kardhani_images?: number; interim?: boolean };
type Sighting = { id: string; src: string; label: string; n: number; best: number; ms: number };

export default function Radar() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [, setIdx] = useState(0);
  const [src, setSrc] = useState(FRAMES[0].src);
  const [boxes, setBoxes] = useState<Det[] | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [conf, setConf] = useState(0.35);
  const [drive, setDrive] = useState(false);
  const [log, setLog] = useState<Sighting[]>([]);
  const [info, setInfo] = useState<Info>({});
  const [err, setErr] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  // live camera mode
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const confRef = useRef(conf);
  const lastLogRef = useRef(0);
  const gpsRef = useRef<{ lat: number; lon: number } | null>(null);
  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [fps, setFps] = useState<number | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(0); // bumps on every new live sighting -> replays the alert animation
  const [full, setFull] = useState(false);
  const [clock, setClock] = useState("");
  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour12: false })), 500);
    return () => clearInterval(t);
  }, [live]);
  function toggleFull() {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }
  useEffect(() => {
    confRef.current = conf;
  }, [conf]);

  useEffect(() => {
    loadDetector().then(() => setReady(true)).catch((e) => setErr(String(e)));
    fetch("/models/heap_detector.json").then((r) => (r.ok ? r.json() : {})).then(setInfo).catch(() => {});
  }, []);

  async function scan() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await detect(img, 0.15);
      setBoxes(r.boxes);
      setMs(r.ms);
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
      const shown = r.boxes.filter((b) => b.conf >= conf);
      const label = FRAMES.find((f) => f.src === src)?.label ?? "Your photo";
      setLog((l) => [{ id: src, src, label, n: shown.length, best: shown[0]?.conf ?? 0, ms: r.ms }, ...l.filter((s) => s.id !== src)].slice(0, 14));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  // scan whenever a new frame has loaded (after the model is ready)
  function onLoad() {
    setBoxes(null);
    if (ready) scan();
  }
  useEffect(() => {
    if (ready && imgRef.current?.complete) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---- live camera: phone back camera or laptop webcam, detector on every frame ----
  async function startLive(mode = facing) {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("The camera needs https (or localhost) and camera permission.");
      return;
    }
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setDrive(false);
      setBoxes(null);
      setLive(true);
      // GPS tag for live sightings (only if the user allows location)
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          const g = { lat: p.coords.latitude, lon: p.coords.longitude };
          gpsRef.current = g;
          setGps(g);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } catch (e) {
      setErr("Camera not available: " + String(e));
    }
  }
  function stopLive() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
    setFps(null);
    setBoxes(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);
  // /radar?live=1 opens straight into the live camera (handy for recording the demo)
  useEffect(() => {
    if (ready && new URLSearchParams(window.location.search).get("live") === "1") startLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // attach the stream once the <video> is on screen, then run the detector frame after frame
  useEffect(() => {
    if (!live || !ready) return;
    const v = videoRef.current;
    if (!v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    v.play().catch(() => {});
    let stop = false;
    let last = performance.now();
    const thumb = document.createElement("canvas");
    async function tick() {
      if (stop) return;
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          const r = await detect(v, 0.15);
          if (stop) return;
          setBoxes(r.boxes);
          setMs(r.ms);
          setSize({ w: v.videoWidth, h: v.videoHeight });
          const now = performance.now();
          setFps(1000 / Math.max(1, now - last));
          last = now;
          const hit = r.boxes.filter((b) => b.conf >= confRef.current);
          // log a sighting with a thumbnail, at most one every 3 s
          if (hit.length && now - lastLogRef.current > 3000) {
            lastLogRef.current = now;
            thumb.width = 160;
            thumb.height = Math.round((160 * v.videoHeight) / v.videoWidth);
            thumb.getContext("2d")!.drawImage(v, 0, 0, thumb.width, thumb.height);
            const g = gpsRef.current;
            const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const label = g ? `Live ${t} · ${g.lat.toFixed(4)}, ${g.lon.toFixed(4)}` : `Live camera ${t}`;
            const id = "live-" + now;
            const src = thumb.toDataURL("image/jpeg", 0.7);
            setLog((l) => [{ id, src, label, n: hit.length, best: hit[0].conf, ms: r.ms }, ...l].slice(0, 14));
            setFlash(now);
            navigator.vibrate?.(120);
          }
        } catch (e) {
          setErr(String(e));
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [live, ready]);

  // "drive the beat": step through the frames like a hopper on its route
  useEffect(() => {
    if (!drive) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const n = (i + 1) % FRAMES.length;
        setSrc(FRAMES[n].src);
        return n;
      });
    }, 2600);
    return () => clearInterval(t);
  }, [drive]);

  const shown = (boxes ?? []).filter((b) => b.conf >= conf);
  const frame = FRAMES.find((f) => f.src === src);
  const flagged = shown.length > 0;
  const liveSightings = log.filter((s) => s.id.startsWith("live-")).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 overflow-x-hidden p-3 sm:p-4 md:gap-5 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-black tracking-wide sm:text-2xl">
            HOPPER<span className="text-lime">EYE</span> <span className="text-muted">RADAR</span>
          </h1>
          <p className="text-sm text-muted">The dash-cam on the hopper flags dump spots as it drives its beat.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/" className="rounded-full bg-panel px-4 py-1.5 text-teal hover:text-text">Ward command</Link>
          <Link href="/collector" className="rounded-full bg-panel px-4 py-1.5 text-teal hover:text-text">Collector app</Link>
        </nav>
      </header>

      <section className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[1fr_360px]">
        {/* dash-cam frame */}
        <div className="flex min-w-0 flex-col gap-3">
          <div
            ref={frameRef}
            className={`relative overflow-hidden rounded-2xl bg-black ${flagged ? "glow-pink" : "glow-teal"} ${full ? "flex items-center justify-center" : ""}`}
          >
           <div
            className="relative w-full"
            style={full && size ? { width: `min(100vw, ${(100 * size.w) / size.h}vh)` } : undefined}
           >
            {live ? (
              <video ref={videoRef} muted playsInline className="block w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={src} alt="dash-cam frame" crossOrigin="anonymous" onLoad={onLoad} className="block w-full" />
            )}
            {/* dash-cam look */}
            <div className="cam-lines" />
            <div className="cam-vignette" />
            {(live || busy || drive) && <div className="scanline" />}
            {(["tl", "tr", "bl", "br"] as const).map((c) => (
              <div key={c} className={`bracket ${c} ${flagged ? "hot" : ""}`} />
            ))}
            {size &&
              shown.map((b, i) => (
                <div
                  key={i}
                  className={`absolute rounded-md border-[3px] border-pink ${live ? "box-live" : ""}`}
                  style={{
                    left: `${(b.x / size.w) * 100}%`,
                    top: `${(b.y / size.h) * 100}%`,
                    width: `${(b.w / size.w) * 100}%`,
                    height: `${(b.h / size.h) * 100}%`,
                    boxShadow: live ? undefined : "0 0 18px rgba(255,95,162,.55), inset 0 0 30px rgba(255,95,162,.18)",
                    transition: live ? "all 120ms linear" : undefined,
                  }}
                >
                  <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-pink px-1.5 py-0.5 font-mono text-[10px] font-bold text-night sm:text-xs">
                    DUMP SPOT {b.conf.toFixed(2)}
                  </span>
                </div>
              ))}
            {/* new live sighting: edge flash + big alert */}
            {live && flash > 0 && (
              <div key={flash}>
                <div className="edge-flash" />
                <div className="alert-flash rounded-xl border-2 border-pink bg-night/85 px-4 py-2 text-center font-display text-base font-black tracking-widest text-pink shadow-[0_0_40px_rgba(255,95,162,.7)] sm:px-6 sm:py-3 sm:text-2xl">
                  ⚠ DUMP SPOT
                  <div className="font-mono text-[10px] font-normal tracking-normal text-text sm:text-xs">
                    logged{gps ? ` · ${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : ""}
                  </div>
                </div>
              </div>
            )}
            {live && (
              <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg sm:block bg-night/80 px-2 py-1 font-mono text-[10px] text-muted sm:px-3 sm:py-1.5 sm:text-xs">
                {clock} · <span className="text-pink">{liveSightings}</span> sighting{liveSightings === 1 ? "" : "s"}
              </div>
            )}
           </div>
            <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-lg bg-night/80 px-2 py-1 font-mono text-[10px] sm:left-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-xs">
              <span className={`text-pink ${live ? "animate-pulse" : ""}`}>● {live ? "LIVE" : "REC"}</span>{" "}
              <span className="text-text">HOPPER 03</span>{" "}
              <span className="text-muted">
                · {live ? (gps ? `GPS ${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : "live camera") : (frame?.place ?? "uploaded photo")}
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-night/80 px-2 py-1 font-mono text-[10px] sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-xs">
              {!ready ? (
                <span className="text-amber">loading model…</span>
              ) : busy ? (
                <span className="text-teal">scanning…</span>
              ) : flagged ? (
                <span className="font-bold text-pink">{shown.length} DUMP SPOT{shown.length > 1 ? "S" : ""} FLAGGED</span>
              ) : boxes ? (
                <span className="text-lime">CLEAR</span>
              ) : null}
              {ms !== null && <span className="text-muted"> · {ms.toFixed(0)} ms</span>}
              {live && fps !== null && <span className="text-muted"> · {fps.toFixed(1)} fps</span>}
              {live && <span className="text-muted sm:hidden"> · {liveSightings} logged</span>}
            </div>
            {live && full && (
              <button
                onClick={stopLive}
                className="absolute right-3 top-3 rounded-full bg-pink px-4 py-2 text-sm font-bold text-night"
              >
                ■ Stop
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-panel/80 p-3 sm:gap-3">
            <button
              onClick={() => (live ? stopLive() : startLive())}
              disabled={!ready}
              className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${live ? "bg-pink text-night" : "bg-teal text-night"}`}
            >
              {live ? "■ Stop camera" : "● Live camera"}
            </button>
            {live && (
              <button
                onClick={() => {
                  const f = facing === "environment" ? "user" : "environment";
                  setFacing(f);
                  startLive(f);
                }}
                className="rounded-full border border-teal px-3 py-2 text-xs text-teal"
              >
                ⟲ Flip
              </button>
            )}
            {live && (
              <button onClick={toggleFull} className="rounded-full border border-teal px-3 py-2 text-xs text-teal">
                ⛶ Full screen
              </button>
            )}
            <button
              disabled={live}
              onClick={() => setDrive((d) => !d)}
              className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${drive ? "bg-pink text-night" : "bg-lime text-night"}`}
            >
              {drive ? "■ Stop the hopper" : "▶ Drive the beat"}
            </button>
            <button onClick={scan} disabled={!ready || busy || live} className="rounded-full border border-teal px-4 py-2 text-sm text-teal disabled:opacity-50">
              Scan this frame
            </button>
            <label className="flex items-center gap-2 text-xs text-muted">
              alert above
              <input type="range" min={0.15} max={0.8} step={0.05} value={conf} onChange={(e) => setConf(+e.target.value)} className="w-24 sm:w-32" />
              <span className="w-8 font-mono text-text">{conf.toFixed(2)}</span>
            </label>
            <label className="ml-auto cursor-pointer rounded-full border border-dashed border-line px-4 py-2 text-xs text-muted hover:text-text">
              Upload a street photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    stopLive();
                    setDrive(false);
                    setSrc(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
          </div>

          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-12 lg:overflow-visible">
            {FRAMES.map((f, i) => (
              <button
                key={f.src}
                onClick={() => {
                  stopLive();
                  setDrive(false);
                  setIdx(i);
                  setSrc(f.src);
                }}
                className={`w-24 shrink-0 snap-start overflow-hidden rounded-lg border-2 lg:w-auto ${!live && src === f.src ? "border-lime" : "border-transparent opacity-70 hover:opacity-100"}`}
                title={f.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={f.label} className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
          {err && <div className="text-xs text-pink">{err}</div>}
        </div>

        {/* side panel */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl bg-panel/80 p-4 glow-teal">
            <h2 className="mb-2 font-display text-sm tracking-wider text-teal">THE MODEL</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <b>{info.model ?? "YOLOv8n"}</b> heap detector, fine-tuned by us
              </li>
              <li className="text-muted">{info.data ?? "open garbage-heap photos (Roboflow, CC BY 4.0)"}</li>
              <li className="text-muted">runs fully in your browser (ONNX Runtime Web), no upload, also on the live camera</li>
              {info.test_map50 !== undefined && (
                <li>
                  <b className="text-lime">{(info.test_map50 * 100).toFixed(1)} %</b> mAP50 on {info.test_images} held-out test photos
                </li>
              )}
              {info.kardhani_images !== undefined && (
                <li>
                  <b className="text-amber">
                    {info.kardhani_hits} of {info.kardhani_images}
                  </b>{" "}
                  of our own Kardhani heaps found (never seen in training)
                </li>
              )}
            </ul>
            {info.interim && <p className="mt-2 text-xs text-amber">Interim checkpoint while training finishes.</p>}
          </div>

          <div className="flex-1 rounded-2xl bg-panel/80 p-4">
            <h2 className="mb-2 font-display text-sm tracking-wider text-pink">SIGHTINGS THIS RUN</h2>
            {log.length === 0 && <p className="text-sm text-muted">Press “Drive the beat”, or turn on the live camera and point it at a street.</p>}
            <ul className="space-y-2">
              {log.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt="" className="h-10 w-14 rounded object-cover" />
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.n > 0 ? (
                    <span className="rounded-full bg-pink/15 px-2 py-0.5 text-xs font-bold text-pink">
                      {s.n} · {s.best.toFixed(2)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-lime/15 px-2 py-0.5 text-xs text-lime">clear</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <footer className="text-xs text-muted">
        Frames: our own Kardhani (Ward 44, Jaipur) photos; canal bank, Chennai: Sindugab, CC BY-SA 4.0 (Wikimedia Commons). The detector was
        trained on open heap photos from Roboflow Universe (garbage_detection v18, CC BY 4.0), not on Indian dash-cam video yet, so treat its
        output on Indian streets as a first test. The real system repeats sightings over days before alerting the inspector.
      </footer>
    </main>
  );
}
