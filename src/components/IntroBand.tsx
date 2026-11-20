import Link from "next/link";

// Three-part intro on the home page: street (radar), doorstep (collector), city (this dashboard).
const CARDS = [
  {
    n: "01",
    title: "STREET",
    sub: "Dump-spot radar",
    fact: "YOLOv8n in your browser · found 10 of 11 Kardhani heaps · live camera",
    href: "/radar",
    cta: "Open radar →",
    text: "text-pink",
    glow: "glow-pink",
    chip: "bg-pink/15 text-pink",
  },
  {
    n: "02",
    title: "DOORSTEP",
    sub: "Segregation score 0–100",
    fact: "one photo → 3×3 grid scan → 67/100 with reasons",
    href: "/collector",
    cta: "Score a bin →",
    text: "text-lime",
    glow: "glow-lime",
    chip: "bg-lime/15 text-lime",
  },
  {
    n: "03",
    title: "CITY",
    sub: "Ward engine + dashboard",
    fact: "5 beats on real OSM streets · 31.6 km · 72 % route efficiency",
    href: "#map",
    cta: "See the ward ↓",
    text: "text-teal",
    glow: "glow-teal",
    chip: "bg-teal/15 text-teal",
  },
];

export default function IntroBand() {
  return (
    <section
      aria-label="How HopperEye works"
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:py-0"
    >
      {CARDS.map((c) => (
        <Link
          key={c.n}
          href={c.href}
          className={`group flex min-w-[78%] snap-start flex-col justify-between gap-2 rounded-2xl bg-panel/80 p-4 transition hover:-translate-y-0.5 sm:min-w-[46%] md:min-w-0 ${c.glow}`}
        >
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-xs ${c.text} opacity-70`}>{c.n}</span>
            <span className={`font-display text-lg font-black tracking-wider ${c.text}`}>{c.title}</span>
            <span className="truncate text-sm text-muted">{c.sub}</span>
          </div>
          <p className="text-sm leading-snug text-text/90">{c.fact}</p>
          <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.chip} group-hover:brightness-125`}>{c.cta}</span>
        </Link>
      ))}
    </section>
  );
}
