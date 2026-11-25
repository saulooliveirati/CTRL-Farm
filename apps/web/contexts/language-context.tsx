"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  type Locale,
  SUPPORTED_LANGUAGES,
  DEFAULT_LOCALE,
  getTranslation,
  LanguageOption,
} from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  availableLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    // 1. Prioridade: Parâmetro URL ?lang=
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang") as Locale | null;
    if (urlLang && SUPPORTED_LANGUAGES.some((l) => l.code === urlLang)) {
      setLocaleState(urlLang);
      localStorage.setItem("ctrl_farm_locale", urlLang);
      document.cookie = `ctrl_farm_locale=${urlLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = urlLang;
      return;
    }

    // 2. Prioridade: LocalStorage
    const saved = localStorage.getItem("ctrl_farm_locale") as Locale | null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      setLocaleState(saved);
      document.cookie = `ctrl_farm_locale=${saved}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = saved;
      return;
    }

    // 3. Prioridade: Cookie
    const match = document.cookie.match(/ctrl_farm_locale=([^;]+)/);
    if (match && match[1]) {
      const cookieLang = match[1] as Locale;
      if (SUPPORTED_LANGUAGES.some((l) => l.code === cookieLang)) {
        setLocaleState(cookieLang);
        localStorage.setItem("ctrl_farm_locale", cookieLang);
        document.documentElement.lang = cookieLang;
        return;
      }
    }

    // 4. Prioridade: Consultar configuração local via API
    fetch("/api/locale")
      .then((res) => res.json())
      .then((data) => {
        if (data?.locale && SUPPORTED_LANGUAGES.some((l) => l.code === data.locale)) {
          setLocaleState(data.locale);
          localStorage.setItem("ctrl_farm_locale", data.locale);
          document.cookie = `ctrl_farm_locale=${data.locale}; path=/; max-age=31536000; SameSite=Lax`;
          document.documentElement.lang = data.locale;
        }
      })
      .catch(() => {
        // Fallback mantém DEFAULT_LOCALE (pt-BR)
      });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === newLocale)) return;
    setLocaleState(newLocale);

    if (typeof window !== "undefined") {
      localStorage.setItem("ctrl_farm_locale", newLocale);
      document.cookie = `ctrl_farm_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;

      // Sincroniza com o desktop/backend
      fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      }).catch(() => {});
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return getTranslation(locale, key, fallback);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      availableLanguages: SUPPORTED_LANGUAGES,
    }),
    [locale, setLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Retorna fallback seguro para componentes usados fora do provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string, fallback?: string) => getTranslation(DEFAULT_LOCALE, key, fallback),
      availableLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
