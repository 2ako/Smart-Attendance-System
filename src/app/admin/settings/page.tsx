"use client";

import React, { useState, useEffect } from "react";
import {
    Settings,
    Save,
    Clock,
    Users,
    ShieldAlert,
    Mail,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { useTranslation } from "@/lib/i18n/context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export default function AdminSettingsPage() {
    const { t, lang, setLang } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        facultyName: "",
        gracePeriodMinutes: 15,
        allowManualAttendance: true,
        absentThreshold: 3,
        contactEmail: ""
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings");
            if (!res.ok) throw new Error(t("error"));
            const data = await res.json();
            setSettings({
                facultyName: data.facultyName || "",
                gracePeriodMinutes: data.gracePeriodMinutes || 15,
                allowManualAttendance: data.allowManualAttendance ?? true,
                absentThreshold: data.absentThreshold || 3,
                contactEmail: data.contactEmail || ""
            });
        } catch (error) {
            toast.error(t("error"));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                body: JSON.stringify(settings),
                headers: { "Content-Type": "application/json" }
            });
            if (!res.ok) throw new Error(t("update_failed"));
            toast.success(t("success"));
        } catch (error) {
            toast.error(t("error"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background">
                <Sidebar role="admin" />
                <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                <div className="container mx-auto max-w-5xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div className="text-start">
                            <h1 className="text-3xl font-extrabold tracking-tight">{t("settings")}</h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {t("manage_global_policies")}
                            </p>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xl shadow-lg shadow-primary/20 gap-2 px-6"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? t("saving") : t("save_changes")}
                        </Button>
                    </div>

                    <div className="grid gap-8">
                        {/* ── Language Settings ──────────────────────────────────── */}
                        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm border-primary/20">
                            <CardHeader className="bg-primary/5 pb-4 text-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Settings size={20} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-lg">{t("lang_settings")}</CardTitle>
                                        <CardDescription>{t("select_lang_desc") || (lang === "ar" ? "اختر لغتك المفضلة للواجهة." : lang === "fr" ? "Sélectionnez votre langue préférée pour l'interface." : "Select your preferred language for the interface.")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <Label className="text-base text-start">{t("select_lang")}</Label>
                                    <Select value={lang} onValueChange={(val: any) => setLang(val)}>
                                        <SelectTrigger className="w-full md:w-[200px] rounded-xl h-12 font-bold uppercase tracking-widest text-[11px] text-start">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="en" className="text-start">English (US)</SelectItem>
                                            <SelectItem value="fr" className="text-start">Français (FR)</SelectItem>
                                            <SelectItem value="ar" className="text-start">العربية (AR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Organization Settings ────────────────────────────────── */}
                        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm text-start">
                            <CardHeader className="bg-muted/30 pb-4 text-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Building2 size={20} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-lg">{t("org_profile")}</CardTitle>
                                        <CardDescription>{t("branding_info")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid gap-2 text-start">
                                    <Label htmlFor="facultyName">{t("faculty_name")}</Label>
                                    <Input
                                        id="facultyName"
                                        value={settings.facultyName}
                                        onChange={(e) => setSettings({ ...settings, facultyName: e.target.value })}
                                        placeholder="e.g. Faculty of Exact Sciences"
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="grid gap-2 text-start">
                                    <Label htmlFor="contactEmail">{t("support_email")}</Label>
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        value={settings.contactEmail}
                                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                                        placeholder="support@university.edu"
                                        className="rounded-xl"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Attendance Policy ────────────────────────────────────── */}
                        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm text-start text-start">
                            <CardHeader className="bg-muted/30 pb-4 text-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                        <Clock size={20} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-lg">{t("attendance_policy")}</CardTitle>
                                        <CardDescription>{t("attendance_policy_desc")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-start">
                                        <Label className="text-base">{t("grace_period")}</Label>
                                        <p className="text-xs text-muted-foreground max-w-[280px]">
                                            {t("grace_period_desc")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            value={settings.gracePeriodMinutes}
                                            onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: parseInt(e.target.value) })}
                                            className="w-20 rounded-xl text-center font-bold"
                                        />
                                        <span className="text-sm font-medium text-muted-foreground">{t("min")}</span>
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-1 text-start">
                                        <Label className="text-base">{t("manual_attendance")}</Label>
                                        <p className="text-xs text-muted-foreground max-w-[280px]">
                                            {t("manual_attendance_desc")}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.allowManualAttendance}
                                        onCheckedChange={(checked) => setSettings({ ...settings, allowManualAttendance: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Security & Alerts ────────────────────────────────────── */}
                        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm text-start">
                            <CardHeader className="bg-muted/30 pb-4 text-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div className="text-start">
                                        <CardTitle className="text-lg">{t("exclusion_thresholds")}</CardTitle>
                                        <CardDescription>{t("exclusion_thresholds_desc")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-start">
                                        <Label className="text-base">{t("absence_limit")}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t("absence_limit_desc")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={settings.absentThreshold}
                                                onChange={(e) => setSettings({ ...settings, absentThreshold: parseInt(e.target.value) })}
                                                className="w-16 rounded-xl text-center font-bold text-red-500"
                                            />
                                            <span className="text-sm font-medium">{t("absences") || (lang === "ar" ? "غيابات" : lang === "fr" ? "absences" : "Absences")}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                        <AlertCircle className="text-primary mt-1" size={20} />
                        <div className="text-start">
                            <p className="text-sm font-bold text-primary">{t("admin_note")}</p>
                            <p className="text-xs text-primary/70 leading-relaxed mt-1">
                                {t("admin_note_desc")}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
