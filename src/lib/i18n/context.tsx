"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations } from "./translations";

interface I18nContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string, data?: Record<string, any>) => string;
    isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>("en");
    const [isRTL, setIsRTL] = useState(false);

    useEffect(() => {
        const savedLang = localStorage.getItem("app_lang") as Language;
        if (savedLang && translations[savedLang]) {
            setLang(savedLang);
        }
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem("app_lang", newLang);

        // Update RTL and HTML lang attribute
        const rtl = newLang === "ar";
        setIsRTL(rtl);
        document.documentElement.dir = rtl ? "rtl" : "ltr";
        document.documentElement.lang = newLang;
    };

    const t = (key: string, data?: Record<string, any>): string => {
        let text = translations[lang][key] || key;
        if (data) {
            Object.keys(data).forEach(k => {
                text = text.replace(`{${k}}`, String(data[k]));
            });
        }
        return text;
    };

    return (
        <I18nContext.Provider value={{ lang, setLang, t, isRTL }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
