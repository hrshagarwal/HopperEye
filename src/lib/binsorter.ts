// Bin-sorter model (MobileNetV2 transfer learning, 12 classes -> green / blue / red bin), run in the browser with ONNX Runtime Web.
// Grid-scan v0: the bin photo is cut into tiles and each tile is classified; the Segregation Score is the share of
// confident tiles whose bin matches the bin the household declared. (An item-level detector replaces the grid later.)

import type * as Ort from "onnxruntime-web";

export type Bin = "green" | "blue" | "red";
export type Labels = { classes: string[]; bins: Record<string, Bin> };
export type TileResult = { row: number; col: number; cls: string; bin: Bin; conf: number };

let session: Ort.InferenceSession | null = null;
let labels: Labels | null = null;
let ortMod: typeof Ort | null = null;

export async function loadModel() {
  if (session && labels && ortMod) return { session, labels, ort: ortMod };
  ortMod = await import("onnxruntime-web");
  ortMod.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";
  const [s, l] = await Promise.all([
    ortMod.InferenceSession.create("/models/waste_mobilenetv2.onnx", { executionProviders: ["wasm"] }),
    fetch("/models/bin_labels.json").then((r) => r.json() as Promise<Labels>),
  ]);
  session = s;
  labels = l;
  return { session: s, labels: l, ort: ortMod };
}

function softmax(v: Float32Array) {
  const m = Math.max(...v);
  const e = Array.from(v, (x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/** Classify one region of an image (source rect sx, sy, sw, sh) into a class + bin. */
async function classifyRegion(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number) {
  const { session, labels, ort } = await loadModel();
  const c = document.createElement("canvas");
  c.width = 224;
  c.height = 224;
  const g = c.getContext("2d")!;
  g.drawImage(img, sx, sy, sw, sh, 0, 0, 224, 224);
  const d = g.getImageData(0, 0, 224, 224).data;
  const A = 224 * 224;
  const f = new Float32Array(3 * A);
  for (let i = 0; i < A; i++) {
    f[i] = d[i * 4] / 255;
    f[A + i] = d[i * 4 + 1] / 255;
    f[2 * A + i] = d[i * 4 + 2] / 255;
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", f, [1, 3, 224, 224]) });
  const p = softmax(out[session.outputNames[0]].data as Float32Array);
  const k = p.indexOf(Math.max(...p));
  const cls = labels.classes[k];
  return { cls, bin: labels.bins[cls], conf: p[k] };
}

export async function classifyWhole(img: HTMLImageElement) {
  return classifyRegion(img, 0, 0, img.naturalWidth, img.naturalHeight);
}

export async function gridScan(img: HTMLImageElement, n = 3): Promise<TileResult[]> {
  const w = img.naturalWidth / n;
  const h = img.naturalHeight / n;
  const out: TileResult[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const res = await classifyRegion(img, c * w, r * h, w, h);
      out.push({ row: r, col: c, ...res });
    }
  return out;
}

export function segregationScore(tiles: TileResult[], declared: Bin, minConf = 0.35) {
  const confident = tiles.filter((t) => t.conf >= minConf);
  const wrong = confident.filter((t) => t.bin !== declared);
  const c = confident.length ? wrong.reduce((a, t) => a + t.conf, 0) / confident.reduce((a, t) => a + t.conf, 0) : 0;
  const counts = new Map<string, number>();
  wrong.forEach((t) => counts.set(t.cls, (counts.get(t.cls) ?? 0) + 1));
  return { score: Math.round(100 * (1 - c)), considered: confident.length, wrong: [...counts.entries()].sort((a, b) => b[1] - a[1]) };
}
