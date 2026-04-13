"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Settings,
    Mail,
    Lock,
    CheckCircle2,
    Save,
    User,
    Loader2
} from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { getProfessorByUserId } from "@/lib/sanity/queries";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export default function ProfSettingsPage() {
    const { t, lang, setLang } = useTranslation();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        async function loadProfile() {
            if (!user?.id) return;
            try {
                const prof = await sanityClient.fetch(getProfessorByUserId, { userId: user.id });
                if (prof) {
                    setFormData(prev => ({
                        ...prev,
                        name: prof.user?.name || "",
                        email: prof.user?.email || ""
                    }));
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadProfile();
    }, [user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            toast.error(t("error_occurred"));
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/prof/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.newPassword || undefined
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || t("error_occurred"));
            }

            toast.success(t("success_occurred"));
            setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="professor" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                <div className="mb-10 animate-enter text-start">
                    <div className="flex items-center gap-3 mb-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary text-start">
                            <Settings size={12} />
                            {t("settings")}
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                        {t("lang_settings")}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium text-start">
                        {t("manage_academic_profile_desc")}
                    </p>
                </div>

                <div className="max-w-4xl animate-enter [animation-delay:50ms] mb-12 text-start">
                    <Card className="rounded-3xl border-none shadow-xl bg-card overflow-hidden border-primary/20 text-start">
                        <CardHeader className="bg-primary/5 border-b border-border/50 p-8 text-start">
                            <div className="flex items-center gap-4 text-start">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary text-start">
                                    <Settings size={24} />
                                </div>
                                <div className="text-start">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight text-start">{t("lang_settings")}</CardTitle>
                                    <CardDescription className="font-medium text-start">{t("interface_lang_pref")}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 text-start">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
                                <Label className="text-lg font-bold text-start">{t("select_lang")}</Label>
                                <Select value={lang} onValueChange={(val: any) => setLang(val)}>
                                    <SelectTrigger className="w-full md:w-[240px] h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2 text-start">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-2 text-start">
                                        <SelectItem value="en" className="font-bold text-start">{t("english")}</SelectItem>
                                        <SelectItem value="fr" className="font-bold text-start">{t("french")}</SelectItem>
                                        <SelectItem value="ar" className="font-bold text-start">{t("arabic")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="max-w-4xl animate-enter [animation-delay:100ms] text-start">
                    <form onSubmit={handleSubmit} className="space-y-8 text-start">
                        <Card className="rounded-3xl border-none shadow-xl bg-card overflow-hidden text-start">
                            <CardHeader className="bg-muted/30 border-b border-border/50 p-8 text-start">
                                <div className="flex items-center gap-4 text-start">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary text-start">
                                        <User size={24} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-xl font-black uppercase tracking-tight text-start">{t("academic_profile")}</CardTitle>
                                        <CardDescription className="font-medium text-start">{t("academic_profile_desc")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 text-start">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-start">{t("full_name")}</Label>
                                        <div className="relative text-start">
                                            <User className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/20 font-bold"
                                                placeholder="Dr. John Doe"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-start">{t("email_address")}</Label>
                                        <div className="relative text-start">
                                            <Mail className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/20 font-bold"
                                                placeholder="faculty@university.edu"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-xl bg-card overflow-hidden text-start">
                            <CardHeader className="bg-muted/30 border-b border-border/50 p-8 text-start">
                                <div className="flex items-center gap-4 text-start">
                                    <div className="p-3 rounded-2xl bg-destructive/10 text-destructive text-start">
                                        <Lock size={24} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-xl font-black uppercase tracking-tight text-start">{t("account_security")}</CardTitle>
                                        <CardDescription className="font-medium text-start">{t("account_security_desc")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 text-start">
                                <div className="space-y-6 max-w-md text-start">
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="new-pass" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-start">{t("new_password")}</Label>
                                        <div className="relative text-start">
                                            <Lock className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                id="new-pass"
                                                type="password"
                                                value={formData.newPassword}
                                                onChange={(e) => setFormData(p => ({ ...p, newPassword: e.target.value }))}
                                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/20 font-bold"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium ml-1 text-start">{t("leave_empty_password")}</p>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="confirm-pass" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-start">{t("confirm_password")}</Label>
                                        <div className="relative text-start">
                                            <CheckCircle2 className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                id="confirm-pass"
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-primary/20 font-bold"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end pt-4 text-start">
                            <Button
                                type="submit"
                                disabled={isSaving || isLoading}
                                className="h-14 px-10 rounded-2xl gap-3 font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-start"
                            >
                                {isSaving ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Save size={20} />
                                )}
                                {t("save_changes")}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
