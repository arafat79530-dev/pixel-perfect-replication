import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

function N({ label, v, set }: { label: string; v: number; set: (n: number) => void }) {
  return (<label className="block text-xs text-muted-foreground">{label}<input type="number" className="field mt-1 text-foreground" value={v} onChange={(e) => set(Number(e.target.value))} /></label>);
}

export function Money({ todayPnl }: { todayPnl: number }) {
  const { t } = useLang();
  const [stake, setStake] = useState(10), [payout, setPayout] = useState(85), [steps, setSteps] = useState(2), [cap, setCap] = useState(100);
  const [cStart, setCStart] = useState(10), [cSteps, setCSteps] = useState(3), [cPay, setCPay] = useState(85);
  const [target, setTarget] = useState(50), [maxLoss, setMaxLoss] = useState(30);
  useEffect(() => { const s = localStorage.getItem("qx-guard"); if (s) { const g = JSON.parse(s); setTarget(g.target); setMaxLoss(g.maxLoss); } }, []);
  useEffect(() => localStorage.setItem("qx-guard", JSON.stringify({ target, maxLoss })), [target, maxLoss]);

  const p = payout / 100;
  const mart: { step: number; amt: number; total: number; profit: number; ok: boolean }[] = [];
  let lost = 0, amt = stake;
  for (let i = 0; i <= steps; i++) {
    if (i > 0) amt = (lost + stake * p) / p;
    lost += amt;
    mart.push({ step: i, amt, total: lost, profit: amt * p - (lost - amt), ok: lost <= cap });
  }
  const comp: { step: number; inv: number; ret: number }[] = [];
  let inv = cStart;
  for (let i = 1; i <= cSteps; i++) { const ret = inv * (1 + cPay / 100); comp.push({ step: i, inv, ret }); inv = ret; }

  const status = todayPnl >= target ? "target" : todayPnl <= -maxLoss ? "stop" : "ok";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="glass space-y-3 p-4 md:col-span-2">
        <h3 className="font-bold">{t("Daily Stop-Loss & Target Guard", "দৈনিক স্টপ-লস ও টার্গেট গার্ড")}</h3>
        <div className="grid grid-cols-2 gap-3"><N label={t("Profit target $", "লাভের টার্গেট $")} v={target} set={setTarget} /><N label={t("Max daily loss $", "সর্বোচ্চ দৈনিক ক্ষতি $")} v={maxLoss} set={setMaxLoss} /></div>
        <div className="num text-sm">{t("Today's P/L (journal)", "আজকের লাভ/ক্ষতি (জার্নাল)")}: <span className={todayPnl >= 0 ? "text-call" : "text-put"}>{todayPnl.toFixed(2)}$</span></div>
        <div className={`rounded-md p-3 text-sm font-semibold ${status === "stop" ? "bg-put/15 text-put" : status === "target" ? "bg-call/15 text-call" : "bg-muted text-foreground"}`}>
          {status === "stop" ? t("🛑 Daily loss limit hit. STOP trading today.", "🛑 দৈনিক ক্ষতির সীমা পূর্ণ। আজ ট্রেড বন্ধ করুন।") : status === "target" ? t("🎯 Target reached! Lock profits and close the platform.", "🎯 টার্গেট পূর্ণ! লাভ রেখে প্ল্যাটফর্ম বন্ধ করুন।") : t("✅ Within limits. Trade with discipline.", "✅ সীমার মধ্যে আছেন। শৃঙ্খলা বজায় রাখুন।")}
        </div>
      </section>
      <section className="glass space-y-3 p-4">
        <h3 className="font-bold">{t("1M Martingale Calculator", "১ মিনিট মার্টিংগেল ক্যালকুলেটর")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <N label={t("Base stake $", "প্রাথমিক বিনিয়োগ $")} v={stake} set={setStake} /><N label={t("Payout %", "পেআউট %")} v={payout} set={setPayout} />
          <label className="block text-xs text-muted-foreground">{t("Steps", "ধাপ")}<select className="field mt-1 text-foreground" value={steps} onChange={(e) => setSteps(Number(e.target.value))}><option value={1}>1-step</option><option value={2}>2-step</option></select></label>
          <N label={t("Max risk cap $", "সর্বোচ্চ ঝুঁকি $")} v={cap} set={setCap} />
        </div>
        <table className="num w-full text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="text-left">#</th><th className="text-right">{t("Stake", "বিনিয়োগ")}</th><th className="text-right">{t("Total risk", "মোট ঝুঁকি")}</th><th className="text-right">{t("Net if win", "জিতলে নিট")}</th></tr></thead>
          <tbody>{mart.map((m) => (<tr key={m.step} className={m.ok ? "" : "text-put"}><td>{m.step === 0 ? t("Entry", "এন্ট্রি") : `M${m.step}`}</td><td className="text-right">{m.amt.toFixed(2)}</td><td className="text-right">{m.total.toFixed(2)}</td><td className="text-right text-call">+{m.profit.toFixed(2)}</td></tr>))}</tbody></table>
        {mart.some((m) => !m.ok) && <p className="text-xs text-put">{t("Exceeds your risk cap — reduce stake or steps.", "ঝুঁকির সীমা ছাড়িয়েছে — বিনিয়োগ বা ধাপ কমান।")}</p>}
      </section>
      <section className="glass space-y-3 p-4">
        <h3 className="font-bold">{t("Compounding Growth Planner", "কম্পাউন্ডিং গ্রোথ প্ল্যানার")}</h3>
        <div className="grid grid-cols-3 gap-3"><N label={t("Start $", "শুরু $")} v={cStart} set={setCStart} /><N label={t("Steps (3-5)", "ধাপ (৩-৫)")} v={cSteps} set={(n) => setCSteps(Math.min(5, Math.max(3, n)))} /><N label={t("Payout %", "পেআউট %")} v={cPay} set={setCPay} /></div>
        <table className="num w-full text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="text-left">#</th><th className="text-right">{t("Invest", "বিনিয়োগ")}</th><th className="text-right">{t("Return", "রিটার্ন")}</th></tr></thead>
          <tbody>{comp.map((c) => (<tr key={c.step}><td>{c.step}</td><td className="text-right">{c.inv.toFixed(2)}</td><td className="text-right text-call">{c.ret.toFixed(2)}</td></tr>))}</tbody></table>
        <p className="text-xs text-muted-foreground">{t("Every step must win. One loss loses the whole run's stake.", "প্রতিটি ধাপ জিততে হবে। একটি হারলেই পুরো রানের বিনিয়োগ হারাবেন।")}</p>
      </section>
    </div>
  );
}
