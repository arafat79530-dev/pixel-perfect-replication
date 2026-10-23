import { useEffect, useState } from "react";
import { analyzeChart, type ChartSignal } from "@/lib/ai.functions";
import { useLang } from "@/lib/i18n";
import { useCountdown } from "./Market";
import { Upload, Loader2, ScanLine } from "lucide-react";
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { connectTelegram } from '@/lib/telegram.functions';

export function beep(up: boolean) {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = up ? 880 : 330; o.connect(g); g.connect(ctx.destination); g.gain.value = 0.15;
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch { /* ignore */ }
}

export function Scanner({ sound }: { sound: boolean }) {
  const analyze = useServerFn(analyzeChart);
  const connect = useServerFn(connectTelegram);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const { t, lang } = useLang();
  const [img, setImg] = useState<string | null>(null);
  const [res, setRes] = useState<ChartSignal | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const secs = useCountdown();

  const load = (f: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { setErr('Use a PNG, JPEG or WebP chart.'); return; }
    if (f.size > 5_000_000) { setErr('Chart image must be under 5 MB.'); return; }
    setErr(null);
    const r = new FileReader(); r.onload = () => { setImg(r.result as string); setRes(null); }; r.readAsDataURL(f);
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files ?? [])][0]; if (f) load(f); };
    window.addEventListener("paste", onPaste); return () => window.removeEventListener("paste", onPaste);
  }, []);

  const run = async () => {
    if (!img) return;
    setBusy(true); setErr(null);
    try { const r = await analyze({ data: { image: img } }); setRes(r); if (sound && r.signal !== "WAIT") beep(r.signal === "CALL"); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };

  const tone = res?.signal === "CALL" ? "text-call border-call glow-call" : res?.signal === "PUT" ? "text-put border-put glow-put" : "text-warn border-warn";
  const label = res ? (res.signal === "CALL" ? t("UP ▲", "উপরে ▲") : res.signal === "PUT" ? t("DOWN ▼", "নিচে ▼") : t("WAIT / NO ENTRY", "অপেক্ষা / এন্ট্রি নয়")) : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={async () => { try { setTelegramUrl(await connect()); } catch (e) { setErr(e instanceof Error ? e.message : 'Telegram failed'); } }}>{t('Connect Telegram', 'Telegram সংযুক্ত করুন')}</Button>
        {telegramUrl && <Button asChild><a href={telegramUrl} target="_blank" rel="noopener noreferrer">{t('Open Telegram bot', 'Telegram বট খুলুন')}</a></Button>}
      </div>
      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); }}
        className="glass flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-4 text-center">
        {img ? <img src={img} alt="chart" className="max-h-72 rounded-md" /> : (<>
          <Upload className="h-8 w-8 text-primary" />
          <div className="font-medium">{t("Upload or paste a Quotex 1M chart screenshot", "কিউটেক্স ১ মিনিট চার্টের স্ক্রিনশট আপলোড বা পেস্ট করুন")}</div>
          <div className="text-xs text-muted-foreground">{t("Real & OTC pairs · Ctrl+V works", "রিয়েল ও OTC পেয়ার · Ctrl+V চলবে")}</div>
        </>)}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
      </label>
      <Button disabled={!img || busy} onClick={run} className="h-12 w-full font-bold">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}
        {busy ? t("Analyzing candles…", "ক্যান্ডেল বিশ্লেষণ চলছে…") : t("Scan next 1M candle", "পরের ১ মিনিট ক্যান্ডেল স্ক্যান")}
      </Button>
      {err && <div className="rounded-md border border-put p-3 text-sm text-put">{err}</div>}
      {res && (
        <div className={`glass space-y-3 border-2 p-5 ${tone}`}>
          <div className="flex items-start justify-between">
            <div><div className="text-xs text-muted-foreground">{res.pair} · {t("Next 1M candle", "পরের ১ মিনিট ক্যান্ডেল")}</div><div className="text-3xl font-black">{label}</div></div>
            <div className="text-right"><div className="num text-3xl font-bold">{Math.round(res.confidence)}%</div><div className="text-xs text-muted-foreground">{t("evidence score", "প্রমাণের স্কোর")}</div></div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-current" style={{ width: `${res.confidence}%` }} /></div>
          <div className="flex flex-wrap gap-1.5">{res.patterns.map((p) => <span key={p} className="rounded bg-muted px-2 py-0.5 text-xs text-foreground">{p}</span>)}</div>
          <p className="text-sm text-foreground">{lang === "bn" ? res.reasoning_bn : res.reasoning_en}</p>
          <div className="rounded-md bg-muted p-3 text-sm text-foreground">⏱ {lang === "bn" ? res.entry_tip_bn : res.entry_tip_en}
            <div className="num mt-1 text-xs text-muted-foreground">{t("Local minute timer — not chart-synced", "স্থানীয় মিনিটের সময় — চার্টের সঙ্গে যুক্ত নয়")}: {secs}s</div></div>
          <div className="text-xs text-muted-foreground">{t("Risk", "ঝুঁকি")}: {res.risk.toUpperCase()}</div>
        </div>
      )}
    </div>
  );
}
