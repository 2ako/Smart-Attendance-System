// ============================================================
// Login Page — Matching Stitch design (split-screen dark)
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    GraduationCap,
    Fingerprint,
    Radio,
    FileBarChart,
    Mail,
    Lock,
    ArrowRight,
    HelpCircle,
    Eye,
    EyeOff,
} from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const { t, lang, setLang } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const user = await login(username, password);
            const roleRoute: Record<string, string> = {
                student: "/student",
                professor: "/prof",
                admin: "/admin",
            };
            router.push(roleRoute[user.role] || "/login");
        } catch (err: any) {
            setError(err.message || t("auth_failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/30">
            {/* ── Left Panel — Branding ─────────────────────────────── */}
            <div className="relative hidden w-1/2 lg:flex lg:flex-col lg:justify-between p-12 py-20 overflow-hidden bg-primary shadow-2xl">
                {/* Background decoration - subtle floating gradients */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-[10%] left-[10%] h-72 w-72 rounded-full bg-white/20 blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[10%] h-96 w-96 rounded-full bg-black/20 blur-[120px] animate-pulse [animation-delay:1s]" />
                </div>

                <div className="relative z-10 animate-enter">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white uppercase">EduSmart</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-6 animate-enter [animation-delay:200ms]">
                    <h2 className="text-5xl font-black leading-tight text-white tracking-tighter">
                        {t("simplify_campus_life").split(" ").map((word, i) => (
                            <span key={i}>
                                {word} {i === 1 && <br />}
                            </span>
                        ))}
                    </h2>
                    <p className="max-w-md text-lg text-white/80 font-medium">
                        {t("campus_life_desc")}
                    </p>
                </div>

                <div className="relative z-10 text-xs font-bold uppercase tracking-widest text-white/40 animate-enter [animation-delay:400ms]">
                    {t("smart_campus_v2")}
                </div>
            </div>

            {/* ── Right Panel — Login Form ──────────────────────────── */}
            <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-24 bg-background relative">
                {/* Language Switcher - Floating Top Right */}
                <div className="absolute top-8 ltr:right-8 rtl:left-8 animate-enter">
                    <Select value={lang} onValueChange={(val: any) => setLang(val)}>
                        <SelectTrigger className="w-[140px] h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] border-2 bg-muted/20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                            <SelectItem value="en" className="font-bold">English</SelectItem>
                            <SelectItem value="fr" className="font-bold">Français</SelectItem>
                            <SelectItem value="ar" className="font-bold text-end">العربية</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="mx-auto w-full max-w-[400px] space-y-10">
                    {/* Header */}
                    <div className="space-y-3 animate-enter">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
                            <GraduationCap size={14} strokeWidth={3} />
                            {t("university_identity")}
                        </div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">{t("welcome_back")}</h1>
                        <p className="text-muted-foreground font-medium">
                            {t("login_desc")}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 animate-enter [animation-delay:200ms]">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                {t("username_label")}
                            </Label>
                            <div className="group relative">
                                <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Mail size={18} />
                                </div>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t("username_placeholder")}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-14 ltr:pl-12 rtl:pr-12 bg-muted/30 border-input rounded-2xl text-foreground placeholder:text-muted-foreground/40 focus:bg-background focus:ring-primary/20 transition-all duration-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                {t("password_label")}
                            </Label>
                            <div className="group relative">
                                <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Mail size={18} className="hidden" />
                                    <Lock size={18} />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 ltr:pl-12 ltr:pr-12 rtl:pr-12 rtl:pl-12 bg-muted/30 border-input rounded-2xl text-foreground placeholder:text-muted-foreground/40 focus:bg-background focus:ring-primary/20 transition-all duration-300"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center ltr:pr-4 rtl:pl-4 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive animate-shake">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="h-14 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-3">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    {t("authenticating")}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {t("sign_in")}
                                    <ArrowRight size={18} className="rtl:rotate-180" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Features Hub */}
                    <div className="pt-8 border-t border-border/50 animate-enter [animation-delay:400ms]">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: <Fingerprint size={20} />, label: t("biometric") },
                                { icon: <Radio size={20} />, label: t("iot_hub") },
                                { icon: <FileBarChart size={20} />, label: t("reports") },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all cursor-default group">
                                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Help Bar */}
                <div className="mt-16 text-center animate-enter [animation-delay:600ms]">
                    <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-4 py-2 rounded-full border border-border bg-muted/10">
                        <HelpCircle size={14} /> {t("need_assistance")} <a href="#" className="text-primary hover:underline">{t("contact_support")}</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
