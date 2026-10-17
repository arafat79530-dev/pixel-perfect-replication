import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (en: string, bn: string) => string };
const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (e) => e });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("qx-lang");
    if (s === "bn" || s === "en") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("qx-lang", l);
  };
  return <LangCtx.Provider value={{ lang, setLang, t: (en, bn) => (lang === "bn" ? bn : en) }}>{children}</LangCtx.Provider>;
}
export const useLang = () => useContext(LangCtx);
