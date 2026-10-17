import { useLang } from "@/lib/i18n";

const S: { en: string; bn: string; steps: [string, string][] }[] = [
  { en: "S/R Reversal on 1M", bn: "১ মিনিটে S/R রিভার্সাল", steps: [
    ["Mark 2-3 strong support/resistance levels on the 5M chart.", "৫ মিনিট চার্টে ২-৩টি শক্তিশালী সাপোর্ট/রেজিস্ট্যান্স চিহ্নিত করুন।"],
    ["Switch to 1M and wait for price to touch the level.", "১ মিনিটে গিয়ে দাম লেভেল স্পর্শ করা পর্যন্ত অপেক্ষা করুন।"],
    ["Look for a rejection candle (pin bar / long wick) at the level.", "লেভেলে রিজেকশন ক্যান্ডেল (পিন বার / লম্বা উইক) খুঁজুন।"],
    ["Confirm RSI is overbought/oversold.", "RSI ওভারবট/ওভারসোল্ড কিনা নিশ্চিত করুন।"],
    ["Enter opposite direction at the next candle open, 1M expiry.", "পরের ক্যান্ডেলের শুরুতে বিপরীত দিকে ১ মিনিট মেয়াদে এন্ট্রি নিন।"],
  ] },
  { en: "1M Trend Continuation", bn: "১ মিনিট ট্রেন্ড কন্টিনিউয়েশন", steps: [
    ["Confirm trend: MA5 above MA20 (up) or below (down).", "ট্রেন্ড নিশ্চিত করুন: MA5, MA20-এর উপরে (আপ) বা নিচে (ডাউন)।"],
    ["Wait for a 1-2 candle pullback toward MA5.", "MA5-এর দিকে ১-২ ক্যান্ডেলের পুলব্যাকের অপেক্ষা করুন।"],
    ["Enter with the trend when a candle closes back in trend direction.", "ক্যান্ডেল আবার ট্রেন্ডের দিকে বন্ধ হলে ট্রেন্ডের দিকে এন্ট্রি নিন।"],
    ["Skip if candles are tiny/doji — the market is flat.", "ক্যান্ডেল ছোট/ডোজি হলে বাদ দিন — মার্কেট ফ্ল্যাট।"],
  ] },
  { en: "OTC Volume / Wick Rejection", bn: "OTC ভলিউম / উইক রিজেকশন", steps: [
    ["OTC is broker-generated — patterns repeat, but can flip anytime.", "OTC ব্রোকার-তৈরি — প্যাটার্ন রিপিট হয়, কিন্তু যেকোনো সময় উল্টে যেতে পারে।"],
    ["Watch for 3+ candles in one direction followed by a big opposite wick.", "এক দিকে ৩+ ক্যান্ডেলের পর বড় বিপরীত উইক লক্ষ্য করুন।"],
    ["Enter in the wick direction for 1M only — never stack trades.", "শুধু ১ মিনিটে উইকের দিকে এন্ট্রি নিন — একসাথে একাধিক ট্রেড নয়।"],
    ["Max 3 OTC trades per session.", "প্রতি সেশনে সর্বোচ্চ ৩টি OTC ট্রেড।"],
  ] },
];
const RULES: [string, string][] = [
  ["Prefer Real markets during London/NY sessions; OTC on weekends only with smaller stakes.", "লন্ডন/নিউইয়র্ক সেশনে রিয়েল মার্কেট বেছে নিন; সপ্তাহান্তে OTC শুধু ছোট বিনিয়োগে।"],
  ["Avoid trading 5 minutes before/after high-impact news.", "বড় নিউজের ৫ মিনিট আগে/পরে ট্রেড করবেন না।"],
  ["Never risk more than 2-5% of balance per trade.", "প্রতি ট্রেডে ব্যালেন্সের ২-৫% এর বেশি ঝুঁকি নেবেন না।"],
  ["After 2 consecutive losses, take a 15-minute break.", "পরপর ২টি হারের পর ১৫ মিনিট বিরতি নিন।"],
  ["If payout drops below 80%, skip the pair.", "পেআউট ৮০% এর নিচে নামলে পেয়ারটি বাদ দিন।"],
];

export function Playbook() {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      {S.map((s, i) => (
        <details key={s.en} open={i === 0} className="glass p-4">
          <summary className="cursor-pointer font-bold text-primary">{t(s.en, s.bn)}</summary>
          <ol className="mt-3 space-y-2">{s.steps.map((st, j) => (<li key={j} className="flex gap-3 text-sm"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">{j + 1}</span>{t(st[0], st[1])}</li>))}</ol>
        </details>
      ))}
      <section className="glass p-4"><h3 className="mb-2 font-bold text-warn">{t("OTC vs Real — Survival Rules", "OTC বনাম রিয়েল — টিকে থাকার নিয়ম")}</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">{RULES.map((r) => <li key={r[0]}>{t(r[0], r[1])}</li>)}</ul></section>
    </div>
  );
}
