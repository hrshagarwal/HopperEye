// Dump-spot detector: YOLOv8n fine-tuned on open garbage-heap photos (Roboflow, CC BY 4.0), exported to ONNX and run
// in the browser with ONNX Runtime Web. One class ("garbage" heap). Input 640x640 letterboxed, output [1, 5, 8400].

import type * as Ort from "onnxruntime-web";

export type Det = { x: number; y: number; w: number; h: number; conf: number }; // in original image pixels
export type DetInfo = { ms: number; boxes: Det[] };

const SIZE = 640;
let session: Ort.InferenceSession | null = null;
let ortMod: typeof Ort | null = null;
let canvas: HTMLCanvasElement | null = null; // reused across frames (live camera)

export async function loadDetector() {
  if (session && ortMod) return { session, ort: ortMod };
  ortMod = await import("onnxruntime-web");
  ortMod.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";
  session = await ortMod.InferenceSession.create("/models/heap_detector.onnx", { executionProviders: ["wasm"] });
  return { session, ort: ortMod };
}

function iou(a: Det, b: Det) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

/** Run the detector on an image or a live video frame. Returns boxes in the source's pixel space. */
export async function detect(img: HTMLImageElement | HTMLVideoElement, minConf = 0.25, nmsIou = 0.45): Promise<DetInfo> {
  const { session, ort } = await loadDetector();
  const W = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const H = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  const r = Math.min(SIZE / W, SIZE / H);
  const nw = Math.round(W * r), nh = Math.round(H * r);
  const px = (SIZE - nw) / 2, py = (SIZE - nh) / 2;
  const c = canvas ?? (canvas = document.createElement("canvas"));
  c.width = SIZE;
  c.height = SIZE;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "rgb(114,114,114)";
  g.fillRect(0, 0, SIZE, SIZE);
  g.drawImage(img, px, py, nw, nh);
  const d = g.getImageData(0, 0, SIZE, SIZE).data;
  const A = SIZE * SIZE;
  const f = new Float32Array(3 * A);
  for (let i = 0; i < A; i++) {
    f[i] = d[i * 4] / 255;
    f[A + i] = d[i * 4 + 1] / 255;
    f[2 * A + i] = d[i * 4 + 2] / 255;
  }
  const t0 = performance.now();
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", f, [1, 3, SIZE, SIZE]) });
  const ms = performance.now() - t0;
  const o = out[session.outputNames[0]];
  const data = o.data as Float32Array;
  const n = o.dims[2]; // 8400 anchors; rows: cx, cy, w, h, score
  const cand: Det[] = [];
  for (let i = 0; i < n; i++) {
    const s = data[4 * n + i];
    if (s < minConf) continue;
    const cx = data[i], cy = data[n + i], w = data[2 * n + i], h = data[3 * n + i];
    cand.push({ x: (cx - w / 2 - px) / r, y: (cy - h / 2 - py) / r, w: w / r, h: h / r, conf: s });
  }
  cand.sort((a, b) => b.conf - a.conf);
  const keep: Det[] = [];
  for (const b of cand) if (keep.every((k) => iou(k, b) < nmsIou)) keep.push(b);
  return {
    ms,
    boxes: keep.map((b) => {
      const x = Math.max(0, b.x), y = Math.max(0, b.y);
      return { x, y, w: Math.min(W, b.x + b.w) - x, h: Math.min(H, b.y + b.h) - y, conf: b.conf };
    }),
  };
}
