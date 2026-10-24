import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LangProvider, useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/qx/SignOutButton";
import { Scanner } from "@/components/qx/Scanner";
import { Market } from "@/components/qx/Market";
import { Money } from "@/components/qx/Money";
import { Journal, isToday, pnl, type Trade } from "@/components/qx/Journal";
import { Playbook } from "@/components/qx/Playbook";
import { ScanLine, CandlestickChart, Calculator, NotebookPen, BookOpen, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/terminal")({
  head: () => ({
    meta: [
      { title: "GHOST TRADER AI — Trading Terminal" },
      { name: "description", content: "Bilingual (বাংলা/English) AI chart scanner, 1M indicators, martingale calculator and trading journal for Quotex 1-minute trades." },
      { property: "og:title", content: "GHOST TRADER AI — Trading Terminal" },
      { property: "og:description", content: "AI next-candle signals, scalping indicators, money management and AI coach for Quotex 1M." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (<LangProvider><App /></LangProvider>),
});

const TABS = [
  { id: "scan", en: "AI Scanner", bn: "এআই স্ক্যানার", I: ScanLine },
  { id: "market", en: "Market", bn: "মার্কেট", I: CandlestickChart },
  { id: "money", en: "Money", bn: "মানি", I: Calculator },
  { id: "journal", en: "Journal", bn: "জার্নাল", I: NotebookPen },
  { id: "play", en: "Playbook", bn: "প্লেবুক", I: BookOpen },
] as const;

function App() {
  const { t, lang, setLang } = useLang();
  const { isAdmin, userId } = Route.useRouteContext();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("scan");
  const [sound, setSound] = useState(true);
  const [trades, setTradesState] = useState<Trade[]>([]);
  useEffect(() => { try { setTradesState(JSON.parse(localStorage.getItem(`ghost-trades-${userId}`) || "[]")); } catch { /* */ } }, [userId]);
  const setTrades = (x: Trade[]) => { setTradesState(x); try { localStorage.setItem(`ghost-trades-${userId}`, JSON.stringify(x)); } catch { localStorage.setItem(`ghost-trades-${userId}`, JSON.stringify(x.map(({ shot: _s, ...r }) => r))); } };
  const todayPnl = trades.filter((x) => isToday(x.time)).reduce((s, x) => s + pnl(x), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground">1M</div>
          <div><h1 className="text-lg font-bold leading-tight">GHOST TRADER <span className="text-primary">AI</span></h1><p className="text-xs text-muted-foreground">{t("Quotex 1-Minute Suite", "কিউটেক্স ১-মিনিট স্যুট")}</p></div></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAdmin && <Button variant="outline" size="sm" asChild><Link to="/members">{t("Admin Panel", "অ্যাডমিন প্যানেল")}</Link></Button>}
          <SignOutButton />
          <button onClick={() => setSound(!sound)} aria-label="sound" className="glass p-2">{sound ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}</button>
          <div className="glass flex p-0.5 text-xs font-semibold">
            {(["en", "bn"] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-md px-2.5 py-1.5 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l === "en" ? "EN" : "বাং"}</button>)}
          </div>
        </div>
      </header>
      <nav className="mb-4 hidden gap-1 md:flex">{TABS.map(({ id, en, bn, I }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><I className="h-4 w-4" />{t(en, bn)}</button>)}</nav>
      <main>
        {tab === "scan" && <Scanner sound={sound} />}
        {tab === "market" && <Market />}
        {tab === "money" && <Money todayPnl={todayPnl} />}
        {tab === "journal" && <Journal trades={trades} setTrades={setTrades} />}
        {tab === "play" && <Playbook />}
      </main>
      <p className="mt-6 rounded-lg border border-warn/40 p-3 text-xs text-muted-foreground">⚠️ {t("Risk disclaimer: Binary options are extremely high risk. AI signals are educational estimates, not financial advice or guarantees. Only trade money you can afford to lose.", "ঝুঁকি সতর্কতা: বাইনারি অপশন অত্যন্ত ঝুঁকিপূর্ণ। এআই সিগন্যাল শুধুমাত্র শিক্ষামূলক অনুমান, আর্থিক পরামর্শ বা নিশ্চয়তা নয়। শুধু সেই টাকাই ট্রেড করুন যা হারালে সমস্যা নেই।")}</p>
      <nav className="glass fixed inset-x-2 bottom-2 z-20 flex justify-around p-1.5 md:hidden">
        {TABS.map(({ id, en, bn, I }) => <button key={id} onClick={() => setTab(id)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] ${tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><I className="h-5 w-5" />{t(en, bn)}</button>)}
      </nav>
    </div>
  );
}
