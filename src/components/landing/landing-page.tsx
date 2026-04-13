"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Languages, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CampusScene } from "./campus-scene"; // The 3D abstract campus room
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translations } from "@/lib/i18n/translations";

export function LandingPage() {
    const { t, lang, setLang } = useTranslation();
    const [showSplash, setShowSplash] = useState(true);
    const router = useRouter();

    const languages = [
        { code: "en", name: t("english"), icon: "🇺🇸" },
        { code: "fr", name: t("french"), icon: "🇫🇷" },
        { code: "ar", name: t("arabic"), icon: "🇩🇿" },
    ];

    const currentLang = languages.find(l => l.code === lang) || languages[0];

    useEffect(() => {
        // Hide splash after 4 seconds to reveal the 3D landing page
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <main className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
            {/* ── Splash Screen (Loading Animation) ─ */}
            <AnimatePresence>
                {showSplash && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary"
                    >
                        {/* Background decorations */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="absolute top-[20%] left-[20%] h-72 w-72 rounded-full bg-white/20 blur-[100px] animate-pulse" />
                            <div className="absolute bottom-[20%] right-[20%] h-96 w-96 rounded-full bg-black/20 blur-[120px] animate-pulse [animation-delay:1s]" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
                                {/* Inner pulse ring */}
                                <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-ping opacity-50" />
                                <GraduationCap size={48} className="text-white" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl font-black tracking-tight text-white uppercase flex items-center gap-1">
                                    EduSmart
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:150ms]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Language Switcher (Top Right) ── */}
            <div className="fixed top-6 right-6 z-40">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="h-10 px-4 rounded-full bg-slate-900 border border-white/20 text-white hover:bg-slate-800 transition-all font-bold uppercase tracking-widest text-[10px] shadow-2xl"
                        >
                            <Languages size={14} className="mr-2 text-blue-400" />
                            {currentLang.name}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl bg-background/80 backdrop-blur-2xl border-border/50 shadow-2xl">
                        {languages.map((langOption) => (
                            <DropdownMenuItem
                                key={langOption.code}
                                onClick={() => setLang(langOption.code as any)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${lang === langOption.code ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted font-medium"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{langOption.icon}</span>
                                    <span className="text-xs uppercase tracking-wider">{langOption.name}</span>
                                </div>
                                {lang === langOption.code && <Check size={14} />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* ── Landing Page (3D Scene + Content) ─ */}
            {!showSplash && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
                >
                    {/* The 3D interactive background */}
                    <CampusScene />

                    {/* Foreground Content - Pure Text with Outlines/Shadows for readability without blocking the scene */}
                    <div className="relative z-20 flex flex-col items-center max-w-3xl mt-20 space-y-10 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 50 }}
                            className="space-y-4"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-blue-300 font-bold uppercase tracking-widest text-xs mx-auto drop-shadow-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                {t("next_gen_system")}
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_5px_15px_rgba(0,0,0,1)] whitespace-pre-line">
                                {t("intelligence_meets_campus")}
                            </h1>
                            <p className="text-lg md:text-xl text-slate-100 font-bold max-w-xl mx-auto drop-shadow-[0_3px_8px_rgba(0,0,0,1)] leading-relaxed">
                                {t("landing_desc")}
                            </p>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 1.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push("/login")}
                            className="pointer-events-auto group relative flex h-16 items-center justify-center gap-4 overflow-hidden rounded-full bg-primary px-10 font-bold uppercase tracking-widest text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:bg-primary/90"
                        >
                            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                                <div className="relative h-full w-8 bg-white/20" />
                            </div>
                            <span className="relative z-10 text-sm">{t("launch_portal")}</span>
                            <ArrowRight size={20} className="relative z-10 transition-transform group-hover:translate-x-1" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </main>
    );
}
