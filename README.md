# HopperEye: every garbage hopper becomes a sensor

**Live app: https://hoppereye.vercel.app** (try `/radar` → "● Live camera" on your phone)

A prototype by students of IIT Jammu & MNIT Jaipur.

Garbage hoppers already reach every door, every day, but they collect waste, not data.
HopperEye uses the collector's phone and a dash-cam on the hopper to measure
**segregation at the doorstep**, flag **dump spots** on the street, and plan **balanced beats**
on the real street network.

## What is in this prototype

| Page | What it shows | Data |
|---|---|---|
| `/` Ward Command | Street graph, 5 beats and Chinese-postman route stats for **Kardhani (Ward 44, Jaipur)** and **Saidapet (Chennai)**; ward segregation KPI, dump-spot pins, lane leaderboard | Streets, beats, route stats: **real**, computed from OpenStreetMap. Scores and dump-spot pins: **demo data** |
| `/collector` Collector app | Photo of a bin → 3 × 3 grid scan with our bin-sorter model running **in the browser** (ONNX) → segregation score 0–100 → WhatsApp-style score card | Model: real (MobileNetV2, 98.9 % correct bin on 1,526 held-out photos). Lane rank and rebate: **demo data**. Score card: **mock** |

| `/radar` Dump-spot radar | Dash-cam style frame → our heap detector (YOLOv8n) runs **in the browser** (ONNX) → pink "DUMP SPOT" boxes, "Drive the beat" mode, sightings log, upload your own street photo | Model: real (trained on 3,669 open heap photos, Roboflow garbage_detection v18, CC BY 4.0; mAP50 **0.824** on 258 held-out test photos; found the heap in **10 of 11** of our own Kardhani photos). Frames: our Kardhani photos + one credited Chennai photo |

`/collector?auto=1` scores the default sample as soon as the page loads.

Full technical report (31 pages): https://drive.google.com/file/d/1nwVVyNltFTgMzJ5Mm1D5HlRUfTiSUDrv/view?usp=sharing

### Honest limits
- The bin-sorter was trained on single items on plain backgrounds. On dense street heaps it is often
  wrong (try the "Kardhani heap (hard case)" sample). An item-level detector trained on Indian waste
  is the next step.
- The heap detector was trained on open, mostly non-Indian street photos. On our Kardhani photos it finds heaps well but also draws some
  extra boxes (precision 0.63), and we have no clean-street test photos yet.
- Segregation scores, dump-spot alerts and lane ranks are simulated until field capture.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (what Vercel runs)
```

Node 18+ is required. Webpack rejects `!` in paths, so keep the project in a folder without `!`.

## Stack
Next.js 15 · React 19 · Tailwind CSS 4 · Leaflet / react-leaflet · onnxruntime-web

## Credits
- Map data © OpenStreetMap contributors (ODbL); tiles from openstreetmap.org
- The route engine (Dijkstra beats + Chinese-postman tours) and the bin-sorter model come from our
  Kardhani solid-waste field study (IIT Jammu coursework, disclosed). HopperEye itself is new.
- Sample photos: our own Kardhani photos and public sample images. Canal bank, Chennai: Sindugab, CC BY-SA 4.0 (Wikimedia Commons).
- Heap detector training data: Roboflow Universe garbage_detection v18 (CC BY 4.0).
