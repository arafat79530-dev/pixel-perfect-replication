import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { PAIRS } from "./Market";
import { coachTrades, type CoachResult } from "@/lib/ai.functions";
import { Loader2, Trash2, Brain } from "lucide-react";

export type Trade = { id: string; time: string; pair: string; dir: "CALL" | "PUT"; amount: number; payout: number; result: "WIN" | "LOSS"; note?: string; shot?: string };

export const pnl = (t: Trade) => (t.result === "WIN" ? (t.amount * t.payout) / 100 : -t.amount);
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function Journal({ trades, setTrades }: { trades: Trade[]; setTrades: (t: Trade[]) => void }) {
  const { t, lang } = useLang();
  const [pair, setPair] = useState(PAIRS[3].id), [amount, setAmount] = useState(10), [payout, setPayout] = useState(85), [note, setNote] = useState(""), [shot, setShot] = useState<string>();
  const [coach, setCoach] = useState<CoachResult | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);

  const log = (dir: "CALL" | "PUT", result: "WIN" | "LOSS") => {
    setTrades([{ id: crypto.randomUUID(), time: new Date().toISOString(), pair, dir, amount, payout, result, note: note || undefined, shot }, ...trades]);
    setNote(""); setShot(undefined);
  };
  const today = trades.filter((x) => isToday(x.time));
  const wins = today.filter((x) => x.result === "WIN").length;
  let streak = 0, maxW = 0, maxL = 0, cw = 0, cl = 0;
  [...today].reverse().forEach((x) => { if (x.result === "WIN") { cw++; cl = 0; } else { cl++; cw = 0; } maxW = Math.max(maxW, cw); maxL = Math.max(maxL, cl); });
  if (today[0]) { const r = today[0].result; for (const x of today) { if (x.result !== r) break; streak++; } }
  const byPair = Object.entries(trades.reduce<Record<string, { w: number; n: number }>>((a, x) => { a[x.pair] ??= { w: 0, n: 0 }; a[x.pair].n++; if (x.result === "WIN") a[x.pair].w++; return a; }, {})).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n).slice(0, 3);

  const runCoach = async () => {
    setBusy(true); setErr(null);
    try { setCoach(await coachTrades({ data: { trades: trades.slice(0, 200).map(({ shot: _s, id: _i, ...r }) => r) } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="glass space-y-3 p-4">
        <h3 className="font-bold">{t("Quick 1-Click Logger", "দ্রুত ১-ক্লিক লগার")}</h3>
        <div className="grid grid-cols-3 gap-2">
          <select className="field" value={pair} onChange={(e) => setPair(e.target.value)}>{PAIRS.map((p) => <option key={p.id}>{p.id}</option>)}</select>
          <input className="field" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="amount" />
          <input className="field" type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} aria-label="payout" />
        </div>
        <div className="flex gap-2">
          <input className="field" placeholder={t("Note (optional)", "নোট (ঐচ্ছিক)")} value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="field w-auto shrink-0 cursor-pointer text-xs text-muted-foreground">{shot ? "📷 ✓" : "📷"}<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setShot(r.result as string); r.readAsDataURL(f); }} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button onClick={() => log("CALL", "WIN")} className="rounded-md bg-call/15 py-2 text-call">▲ CALL · {t("Win", "জয়")}</button>
          <button onClick={() => log("PUT", "WIN")} className="rounded-md bg-call/15 py-2 text-call">▼ PUT · {t("Win", "জয়")}</button>
          <button onClick={() => log("CALL", "LOSS")} className="rounded-md bg-put/15 py-2 text-put">▲ CALL · {t("Loss", "হার")}</button>
          <button onClick={() => log("PUT", "LOSS")} className="rounded-md bg-put/15 py-2 text-put">▼ PUT · {t("Loss", "হার")}</button>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Box l={t("Today's win rate", "আজকের জয়ের হার")} v={today.length ? `${Math.round((wins / today.length) * 100)}%` : "—"} s={`${wins}/${today.length}`} />
        <Box l={t("Current streak", "বর্তমান ধারা")} v={today[0] ? `${streak} ${today[0].result === "WIN" ? "W" : "L"}` : "—"} />
        <Box l={t("Max wins / losses", "সর্বোচ্চ জয় / হার")} v={`${maxW} / ${maxL}`} />
        <Box l={t("Best pairs", "সেরা পেয়ার")} v={byPair[0]?.[0] ?? "—"} s={byPair.map(([p, s]) => `${p.replace(" OTC", "*")} ${Math.round((s.w / s.n) * 100)}%`).join(" · ")} />
      </div>
      <section className="glass space-y-3 p-4">
        <div className="flex items-center justify-between"><h3 className="font-bold">{t("AI Performance Coach", "এআই পারফরম্যান্স কোচ")}</h3>
          <button disabled={busy || trades.length < 3} onClick={runCoach} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}{t("Analyze", "বিশ্লেষণ")}</button></div>
        {trades.length < 3 && <p className="text-xs text-muted-foreground">{t("Log at least 3 trades.", "অন্তত ৩টি ট্রেড লগ করুন।")}</p>}
        {err && <p className="text-sm text-put">{err}</p>}
        {coach && (<div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">{coach.issues.filter((i) => i !== "none").map((i) => <span key={i} className="rounded bg-put/15 px-2 py-0.5 text-xs text-put">{i.replace("_", " ")}</span>)}</div>
          <p>{lang === "bn" ? coach.summary_bn : coach.summary_en}</p>
          <ul className="list-disc space-y-1 pl-5">{(lang === "bn" ? coach.tips_bn : coach.tips_en).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>)}
      </section>
      <section className="glass divide-y">
        {trades.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("No trades yet.", "এখনো কোনো ট্রেড নেই।")}</p>}
        {trades.slice(0, 50).map((x) => (
          <div key={x.id} className="flex items-center gap-3 p-3 text-sm">
            {x.shot && <img src={x.shot} alt="" className="h-8 w-8 rounded object-cover" />}
            <div className="flex-1"><div className="font-medium">{x.pair} <span className={x.dir === "CALL" ? "text-call" : "text-put"}>{x.dir}</span></div><div className="text-xs text-muted-foreground">{new Date(x.time).toLocaleString()} {x.note && `· ${x.note}`}</div></div>
            <div className={`num font-semibold ${x.result === "WIN" ? "text-call" : "text-put"}`}>{pnl(x) > 0 ? "+" : ""}{pnl(x).toFixed(2)}</div>
            <button onClick={() => setTrades(trades.filter((y) => y.id !== x.id))} aria-label="delete" className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>))}
      </section>
    </div>
  );
}
function Box({ l, v, s }: { l: string; v: string; s?: string }) {
  return (<div className="glass p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="num text-lg font-semibold">{v}</div>{s && <div className="truncate text-xs text-muted-foreground">{s}</div>}</div>);
}
