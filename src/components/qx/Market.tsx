import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

export const PAIRS = [
  { id: "EUR/USD", base: 1.0852 }, { id: "GBP/USD", base: 1.2714 }, { id: "USD/JPY", base: 149.32 },
  { id: "EUR/USD OTC", base: 1.0861 }, { id: "GBP/USD OTC", base: 1.2702 }, { id: "USD/INR OTC", base: 83.21 },
  { id: "USD/BDT OTC", base: 109.7 }, { id: "AUD/CAD OTC", base: 0.9012 },
];

type Candle = { o: number; h: number; l: number; c: number };

function seed(base: number, n = 60): Candle[] {
  const out: Candle[] = [];
  let p = base;
  for (let i = 0; i < n; i++) out.push(next(p, base)), (p = out[i].c);
  return out;
}
function next(p: number, base: number): Candle {
  const v = base * 0.0006;
  const c = p + (Math.random() - 0.5) * v * 2;
  return { o: p, c, h: Math.max(p, c) + Math.random() * v * 0.6, l: Math.min(p, c) - Math.random() * v * 0.6 };
}

const sma = (a: number[], n: number) => a.slice(-n).reduce((s, x) => s + x, 0) / Math.min(n, a.length);
function rsi(c: number[], n = 7) {
  let g = 0, l = 0;
  for (let i = c.length - n; i < c.length; i++) { const d = c[i] - c[i - 1]; d > 0 ? (g += d) : (l -= d); }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
function stoch(cs: Candle[], n = 5) {
  const s = cs.slice(-n); const hi = Math.max(...s.map((x) => x.h)); const lo = Math.min(...s.map((x) => x.l));
  return hi === lo ? 50 : ((cs[cs.length - 1].c - lo) / (hi - lo)) * 100;
}
function boll(c: number[], n = 20) {
  const s = c.slice(-n); const m = sma(s, n); const sd = Math.sqrt(s.reduce((a, x) => a + (x - m) ** 2, 0) / n);
  return { m, up: m + 2 * sd, lo: m - 2 * sd, width: (4 * sd) / m };
}

export function useCountdown() {
  const [s, setS] = useState(60);
  useEffect(() => { const t = setInterval(() => setS(60 - new Date().getSeconds()), 250); return () => clearInterval(t); }, []);
  return s;
}

export function Market() {
  const { t } = useLang();
  const [pair, setPair] = useState(PAIRS[3]);
  const [candles, setCandles] = useState<Candle[]>(() => seed(PAIRS[3].base));
  const secs = useCountdown();
  const lastSec = useRef(secs);

  useEffect(() => setCandles(seed(pair.base)), [pair]);
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((cs) => {
        const cur = { ...cs[cs.length - 1] };
        const v = pair.base * 0.00012;
        cur.c += (Math.random() - 0.5) * v * 2;
        cur.h = Math.max(cur.h, cur.c); cur.l = Math.min(cur.l, cur.c);
        return [...cs.slice(0, -1), cur];
      });
    }, 500);
    return () => clearInterval(id);
  }, [pair]);
  useEffect(() => {
    if (secs > lastSec.current) setCandles((cs) => [...cs.slice(-59), { ...next(cs[cs.length - 1].c, pair.base), h: cs[cs.length - 1].c, l: cs[cs.length - 1].c, c: cs[cs.length - 1].c, o: cs[cs.length - 1].c }]);
    lastSec.current = secs;
  }, [secs, pair]);

  const ind = useMemo(() => {
    const c = candles.map((x) => x.c);
    const r = rsi(c), st = stoch(candles), b = boll(c);
    const ma5 = sma(c, 5), ma20 = sma(c, 20), last = c[c.length - 1];
    let score = 0;
    score += r < 30 ? 1 : r > 70 ? -1 : 0;
    score += st < 20 ? 1 : st > 80 ? -1 : 0;
    score += ma5 > ma20 ? 1 : -1;
    score += last > ma5 ? 0.5 : -0.5;
    score += last < b.lo ? 1 : last > b.up ? -1 : 0;
    const consensus = score >= 2.5 ? "SC" : score >= 1 ? "C" : score <= -2.5 ? "SP" : score <= -1 ? "P" : "N";
    return { r, st, b, ma5, ma20, last, consensus, squeeze: b.width < 0.0006 };
  }, [candles]);

  const hi = Math.max(...candles.map((x) => x.h)), lo = Math.min(...candles.map((x) => x.l));
  const W = 600, H = 260, cw = W / candles.length;
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * (H - 10) - 5;
  const dec = pair.base > 50 ? 3 : 5;
  const cons: Record<string, [string, string, string]> = {
    SC: ["Strong Call", "শক্তিশালী কল", "text-call"], C: ["Call", "কল", "text-call"], N: ["Neutral", "নিরপেক্ষ", "text-muted-foreground"],
    P: ["Put", "পুট", "text-put"], SP: ["Strong Put", "শক্তিশালী পুট", "text-put"],
  };
  const cc = cons[ind.consensus];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PAIRS.map((p) => (
          <button key={p.id} onClick={() => setPair(p)} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${p.id === pair.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>{p.id}</button>
        ))}
      </div>
      <div className="glass p-3">
        <div className="mb-2 flex items-center justify-between">
          <div><div className="text-sm text-muted-foreground">{pair.id} · 1M</div><div className="num text-xl">{ind.last.toFixed(dec)}</div></div>
          <div className="text-right"><div className="text-xs text-muted-foreground">{t("Candle closes in", "ক্যান্ডেল শেষ হবে")}</div><div className={`num text-2xl ${secs <= 5 ? "text-put" : "text-primary"}`}>00:{String(secs % 60).padStart(2, "0")}</div></div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full">
          <polyline fill="none" stroke="var(--warn)" strokeOpacity={0.5} strokeWidth={1} points={candles.map((_, i) => `${i * cw + cw / 2},${y(sma(candles.slice(0, i + 1).map((x) => x.c), 20))}`).join(" ")} />
          {candles.map((k, i) => {
            const up = k.c >= k.o; const col = up ? "var(--call)" : "var(--put)";
            return (<g key={i}><line x1={i * cw + cw / 2} x2={i * cw + cw / 2} y1={y(k.h)} y2={y(k.l)} stroke={col} /><rect x={i * cw + 1} width={Math.max(cw - 2, 1)} y={y(Math.max(k.o, k.c))} height={Math.max(Math.abs(y(k.o) - y(k.c)), 1)} fill={col} /></g>);
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="RSI (7)" value={ind.r.toFixed(1)} note={ind.r < 30 ? t("Oversold", "ওভারসোল্ড") : ind.r > 70 ? t("Overbought", "ওভারবট") : t("Normal", "স্বাভাবিক")} tone={ind.r < 30 ? "text-call" : ind.r > 70 ? "text-put" : ""} />
        <Stat label="Stoch (5)" value={ind.st.toFixed(1)} note={ind.st < 20 ? t("Oversold", "ওভারসোল্ড") : ind.st > 80 ? t("Overbought", "ওভারবট") : "—"} tone={ind.st < 20 ? "text-call" : ind.st > 80 ? "text-put" : ""} />
        <Stat label="Bollinger" value={ind.squeeze ? t("Squeeze", "স্কুইজ") : ind.last > ind.b.up ? t("Upper break", "উপরে ব্রেক") : ind.last < ind.b.lo ? t("Lower break", "নিচে ব্রেক") : t("Inside", "ভেতরে")} note={t("Breakout alert", "ব্রেকআউট সতর্কতা")} tone={ind.squeeze ? "text-warn" : ""} />
        <Stat label="MA 5/20" value={ind.ma5 > ind.ma20 ? "▲" : "▼"} note={ind.ma5 > ind.ma20 ? t("Uptrend", "আপট্রেন্ড") : t("Downtrend", "ডাউনট্রেন্ড")} tone={ind.ma5 > ind.ma20 ? "text-call" : "text-put"} />
      </div>
      <div className="glass flex items-center justify-between p-4">
        <span className="text-sm text-muted-foreground">{t("Indicator consensus", "ইন্ডিকেটর সারসংক্ষেপ")}</span>
        <span className={`text-xl font-bold ${cc[2]}`}>{t(cc[0], cc[1])}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t("Simulated data for practice — not a live Quotex feed.", "অনুশীলনের জন্য সিমুলেটেড ডেটা — লাইভ কিউটেক্স ফিড নয়।")}</p>
    </div>
  );
}

function Stat({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) {
  return (<div className="glass p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`num text-lg font-semibold ${tone}`}>{value}</div><div className="text-xs text-muted-foreground">{note}</div></div>);
}
