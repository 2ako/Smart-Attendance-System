"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { useTranslation } from "@/lib/i18n/context";
import {
    Settings,
    Mail,
    Lock,
    ShieldCheck,
    Loader2,
    GraduationCap,
    Fingerprint,
    CreditCard,
    Layout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export default function StudentSettingsPage() {
    const { t, lang, setLang } = useTranslation();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [student, setStudent] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/student/profile");
                if (res.ok) {
                    const data = await res.json();
                    setStudent(data.student);
                    setEmail(data.student.user?.email || "");
                }
            } catch (error) {
                console.error("Error loading profile:", error);
                toast.error(t("error"));
            } finally {
                setIsLoading(false);
            }
        }
        loadProfile();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            toast.error(t("error"));
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/student/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: password || undefined }),
            });

            if (res.ok) {
                toast.success(t("success"));
                setPassword("");
                setConfirmPassword("");
            } else {
                const data = await res.json();
                throw new Error(data.message || "Failed to update profile");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-background">
                <Sidebar role="student" />
                <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("loading")}</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <Settings size={12} />
                            {t("settings")}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase tracking-tighter">{t("lang_settings")}</h1>
                            <p className="text-muted-foreground font-medium max-w-2xl">
                                {t("manage_profile_desc")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl animate-enter [animation-delay:50ms] mb-12">
                    <Card className="rounded-[40px] border-none shadow-2xl bg-card overflow-hidden border-primary/20">
                        <CardHeader className="p-8 pb-4 bg-primary/5 text-start">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">{t("lang_settings")}</CardTitle>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("lang_settings_desc")}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <Label className="text-lg font-black uppercase tracking-tight text-muted-foreground">{t("select_lang")}</Label>
                                <Select value={lang} onValueChange={(val: any) => setLang(val)}>
                                    <SelectTrigger className="w-full md:w-[280px] h-16 rounded-[24px] font-black uppercase tracking-widest text-xs border-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[24px] border-2">
                                        <SelectItem value="en" className="font-bold">English (US)</SelectItem>
                                        <SelectItem value="fr" className="font-bold">Français (FR)</SelectItem>
                                        <SelectItem value="ar" className="font-bold">العربية (AR)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* ── Left Column: Personal & Security ────────────────── */}
                    <div className="xl:col-span-2 space-y-8 animate-enter [animation-delay:100ms]">
                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            <Card className="rounded-[40px] border-none shadow-2xl bg-card border border-white/10 overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black uppercase tracking-tight">{t("contact_information")}</CardTitle>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("update_email_desc")}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("email_address")}</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                            <Input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="h-14 pl-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium"
                                                placeholder="e.g. ammar@university.edu"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[40px] border-none shadow-2xl bg-card border border-white/10 overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black uppercase tracking-tight">{t("security_credentials")}</CardTitle>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("update_password_desc")}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("new_password")}</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors" size={18} />
                                                <Input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="h-14 pl-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("confirm_password")}</Label>
                                            <div className="relative group">
                                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors" size={18} />
                                                <Input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="h-14 pl-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="h-16 px-12 rounded-[24px] bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all gap-3"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {t("synchronizing_records")}
                                        </>
                                    ) : (
                                        <>
                                            {t("save_preferences")}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* ── Right Column: Academic Registry ────────────────── */}
                    <div className="space-y-8 animate-enter [animation-delay:200ms]">
                        <Card className="rounded-[40px] border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden h-fit">
                            <CardHeader className="p-8 pb-4 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                                        <GraduationCap size={20} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{t("academic_profile")}</CardTitle>
                                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t("official_record")}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{t("full_name")}</p>
                                    <p className="text-xl font-black uppercase tracking-tight">{student?.fullName || student?.user?.name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{t("matricule")}</p>
                                        <p className="font-mono font-bold tracking-tight">{student?.matricule}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{t("level")}</p>
                                        <Badge className="bg-white/20 text-white border-none font-black text-[9px] h-6">
                                            {student?.level}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{t("study_field")} / {t("specialty")}</p>
                                    <p className="font-bold text-sm uppercase tracking-tight">
                                        {student?.studyField} <span className="text-white/40 mx-2">|</span> {student?.specialty}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/5 flex items-center justify-center mb-1">
                                                <Fingerprint size={18} className={student?.fingerprintId ? "text-green-300" : "text-white/30"} />
                                            </div>
                                            <p className="text-[8px] font-bold uppercase text-white/60">{t("biometrics")}</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/5 flex items-center justify-center mb-1">
                                                <CreditCard size={18} className={student?.rfidUid ? "text-green-300" : "text-white/30"} />
                                            </div>
                                            <p className="text-[8px] font-bold uppercase text-white/60">{t("rfid_card")}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-bold uppercase text-white/40 mb-1">{t("group_identifier")}</p>
                                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary font-black text-xs">
                                            {student?.group || "G1"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-8 rounded-[40px] bg-muted/20 border border-border/50 text-center space-y-4">
                            <Layout className="mx-auto text-muted-foreground/30" size={32} />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed text-center max-w-xs mx-auto">
                                {t("academic_data_notice")}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
