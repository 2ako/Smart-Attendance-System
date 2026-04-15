"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, Layers, GraduationCap, Users, X, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

import { sanityClient } from "@/lib/sanity/client";
import { getAllAcademicConfigs } from "@/lib/sanity/queries";

interface AcademicStructureManagerProps {
    initialConfigs?: any[];
    initialUser?: any;
}

export function AcademicStructureManager({ initialConfigs, initialUser }: AcademicStructureManagerProps) {
    const { t } = useTranslation();
    const [configs, setConfigs] = useState<any[]>(initialConfigs || []);
    const [loading, setLoading] = useState(!initialConfigs);
    const [saving, setSaving] = useState(false);
    const [originalConfigs, setOriginalConfigs] = useState<any[]>(initialConfigs || []);
    const [selectedLevel, setSelectedLevel] = useState("L1");
    const [currentUser, setCurrentUser] = useState<any>(initialUser || null);

    useEffect(() => {
        if (initialConfigs && initialUser) {
            setConfigs(initialConfigs);
            setOriginalConfigs(JSON.parse(JSON.stringify(initialConfigs)));
            setCurrentUser(initialUser);
            setLoading(false);
        } else {
            fetchInitialData();
        }
    }, [initialConfigs, initialUser]);

    async function fetchInitialData() {
        setLoading(true);
        try {
            // Get current user to check scoping
            const userRes = await fetch("/api/auth/me");
            const userData = await userRes.json();
            const userProfile = userData.user;
            setCurrentUser(userProfile);

            // Fetch the parent studyField document for global specialties
            const studyFieldCode = userProfile?.studyField || "GLOBAL";
            let globalSpecialties: any[] = [];

            if (studyFieldCode !== "GLOBAL") {
                const sf = await sanityClient.fetch(
                    `*[_type == "studyField" && (code == $code || _id == $code)][0]`,
                    { code: studyFieldCode }
                );
                globalSpecialties = sf?.specialties || [];
            }

            // Get configurations
            const data = await sanityClient.fetch(getAllAcademicConfigs);
            const levels = ["L1", "L2", "L3", "M1", "M2"];

            const fullConfigs = levels.map(L => {
                // Look for current scoped config OR legacy config with no studyField
                const existing = data.find((d: any) =>
                    d.level === L && (d.studyField === studyFieldCode || (!d.studyField && studyFieldCode !== "GLOBAL"))
                );

                // If no level-specific config exists, try matching specialties from the studyField
                // that have this level in their 'levels' array (or no levels at all)
                const fallbackSpecialties = globalSpecialties
                    .filter((s: any) => !s.levels || s.levels.length === 0 || s.levels.includes(L))
                    .map((s: any) => ({
                        name: s.name,
                        groups: s.groups || ["G1"]
                    }));

                return existing || {
                    _type: "academicConfig",
                    level: L,
                    studyField: studyFieldCode,
                    specialties: fallbackSpecialties,
                    groups: []
                };
            });
            setConfigs(fullConfigs);
            setOriginalConfigs(JSON.parse(JSON.stringify(fullConfigs)));
        } catch (error) {
            console.error("Error fetching academic data:", error);
            toast.error(t("load_structure_error"));
        } finally {
            setLoading(false);
        }
    }

    const currentConfig = configs.find(c => c.level === selectedLevel) || { level: selectedLevel, specialties: [], groups: [] };
    const originalConfig = originalConfigs.find(c => c.level === selectedLevel) || { level: selectedLevel, specialties: [], groups: [] };

    const hasChanges = JSON.stringify(currentConfig.specialties) !== JSON.stringify(originalConfig.specialties) ||
        JSON.stringify(currentConfig.groups) !== JSON.stringify(originalConfig.groups);

    const updateConfig = (newData: any) => {
        setConfigs(prev => prev.map(c => c.level === selectedLevel ? { ...c, ...newData } : c));
    };

    const addSpecialty = () => {
        const newSpecialties = [...(currentConfig.specialties || []), { name: "", groups: ["G1"] }];
        updateConfig({ specialties: newSpecialties });
    };

    const removeSpecialty = (index: number) => {
        const newSpecialties = currentConfig.specialties.filter((_: any, i: number) => i !== index);
        updateConfig({ specialties: newSpecialties });
    };

    const updateSpecialtyName = (index: number, name: string) => {
        const newSpecialties = [...currentConfig.specialties];
        newSpecialties[index].name = name.toUpperCase();
        updateConfig({ specialties: newSpecialties });
    };

    const addGroupToSpecialty = (sIndex: number) => {
        const newSpecialties = [...currentConfig.specialties];
        const groups = newSpecialties[sIndex].groups || [];
        const nextNum = groups.length + 1;
        newSpecialties[sIndex].groups = [...groups, `G${nextNum}`];
        updateConfig({ specialties: newSpecialties });
    };

    const removeGroupFromSpecialty = (sIndex: number, gIndex: number) => {
        const newSpecialties = [...currentConfig.specialties];
        newSpecialties[sIndex].groups = newSpecialties[sIndex].groups.filter((_: any, i: number) => i !== gIndex);
        updateConfig({ specialties: newSpecialties });
    };

    const updateGroupName = (sIndex: number, gIndex: number, name: string) => {
        const newSpecialties = [...currentConfig.specialties];
        newSpecialties[sIndex].groups[gIndex] = name.toUpperCase();
        updateConfig({ specialties: newSpecialties });
    };

    const clearSpecialtyGroups = (sIndex: number) => {
        const newSpecialties = [...currentConfig.specialties];
        newSpecialties[sIndex].groups = [];
        updateConfig({ specialties: newSpecialties });
    };

    const addLevelGroup = () => {
        const newGroups = [...(currentConfig.groups || []), `G${(currentConfig.groups?.length || 0) + 1}`];
        updateConfig({ groups: newGroups });
    };

    const removeLevelGroup = (index: number) => {
        const newGroups = currentConfig.groups.filter((_: any, i: number) => i !== index);
        updateConfig({ groups: newGroups });
    };

    const updateLevelGroupName = (index: number, name: string) => {
        const newGroups = [...currentConfig.groups];
        newGroups[index] = name.toUpperCase();
        updateConfig({ groups: newGroups });
    };

    const clearLevelGroups = () => {
        updateConfig({ groups: [] });
    };

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/academic-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    level: selectedLevel,
                    specialties: currentConfig.specialties,
                    groups: currentConfig.groups,
                    studyField: currentUser?.studyField
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.message || "Failed to save changes");
            }

            toast.success(t("config_synced", { level: selectedLevel }));

            // Update original configs after successful save
            setOriginalConfigs(prev => prev.map(c => c.level === selectedLevel ? JSON.parse(JSON.stringify(currentConfig)) : c));
        } catch (error: any) {
            console.error("Save Error:", error);
            toast.error(error.message || t("sync_error"));
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-10 lg:p-20 space-y-4 bg-muted/20 rounded-3xl lg:rounded-[40px] border-2 border-dashed border-border/50 animate-pulse">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">{t("identifying_persona")}</p>
        </div>
    );

    const isSuperAdmin = !currentUser?.studyField;

    return (
        <Card className="rounded-3xl lg:rounded-[40px] border-none shadow-2xl bg-card/60 backdrop-blur-3xl overflow-hidden border border-white/5 relative">
            <CardHeader className="p-6 lg:p-10 pb-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    {/* Title Section */}
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[24px] bg-primary shadow-xl shadow-primary/20 flex items-center justify-center text-white">
                            <Layers size={32} />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tighter">{t("university_structure")}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t("institutional_repository")}</span>
                                <Info size={12} className="text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                            </div>
                        </div>
                    </div>

                    {/* Scoping Badge (Now integrated into flow) */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={cn(
                            "px-4 py-2 rounded-2xl flex items-center gap-2 border shadow-sm transition-all",
                            currentUser?.studyField
                                ? "bg-primary/5 border-primary/20 text-primary"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                        )}>
                            {currentUser?.studyField ? (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t("scoped_dept", { dept: currentUser.studyField })}</span>
                                </>
                            ) : (
                                <>
                                    <ShieldAlert size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t("universal_mode")}</span>
                                </>
                            )}
                        </div>

                        {/* Level Switcher */}
                        <div className="flex gap-1.5 sm:gap-2 p-1 bg-muted/80 rounded-2xl sm:rounded-3xl border border-border/40 backdrop-blur-md overflow-x-auto scrollbar-none max-w-full">
                            {["L1", "L2", "L3", "M1", "M2"].map(L => (
                                <button
                                    key={L}
                                    onClick={() => setSelectedLevel(L)}
                                    className={cn(
                                        "px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] font-black transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap",
                                        selectedLevel === L
                                            ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30"
                                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                    )}
                                >
                                    {L}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 lg:p-10 pt-6 space-y-12">
                {/* ── Guidance Banner ──────────────────────────── */}
                {currentUser?.studyField && (
                    <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 flex items-start gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <GraduationCap size={20} />
                        </div>
                        <div className="space-y-1">
                            <h5 className="text-xs font-black uppercase tracking-widest text-primary">{t("dept_scoping_active")}</h5>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight leading-relaxed">
                                {t("dept_scoping_desc", { level: selectedLevel, dept: currentUser.studyField })}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Specialties Section ────────────────────────────── */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground/80">{t("specialty")}</h4>
                            <div className="h-[2px] w-12 bg-primary/20 rounded-full" />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={addSpecialty}
                            className="h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 border border-primary/20 px-6 transition-all hover:shadow-lg"
                        >
                            <Plus size={16} className="mr-2" /> {t("add_specialty")}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {currentConfig.specialties?.map((spec: any, sIdx: number) => (
                            <div key={sIdx} className="group/spec relative p-0.5 sm:p-1 rounded-[32px] lg:rounded-[40px] bg-gradient-to-br from-background via-muted/10 to-transparent border border-border/50 hover:border-primary/30 transition-all duration-700 shadow-sm hover:shadow-2xl hover:shadow-primary/5">
                                <div className="p-6 lg:p-8 space-y-6 text-start">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("specialty_name")}</Label>
                                            <Input
                                                value={spec.name}
                                                onChange={(e) => updateSpecialtyName(sIdx, e.target.value)}
                                                placeholder={t("specialty_placeholder")}
                                                className="h-12 rounded-2xl bg-background border-none shadow-sm font-black text-sm focus-visible:ring-2 focus-visible:ring-primary uppercase px-6"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeSpecialty(sIdx)}
                                            className="h-10 w-10 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all sm:ml-4 lg:opacity-0 lg:group-hover/spec:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                                <Users size={14} className="text-primary/60" />
                                                {t("groups")}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => addGroupToSpecialty(sIdx)}
                                                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 py-1 rounded-lg transition-all"
                                                >
                                                    + {t("add_new")}
                                                </button>
                                                {spec.groups?.length > 0 && (
                                                    <button
                                                        onClick={() => clearSpecialtyGroups(sIdx)}
                                                        className="text-[8px] font-black uppercase tracking-widest text-destructive/40 hover:text-destructive px-1.5 py-0.5 rounded transition-all"
                                                        title={t("reset")}
                                                    >
                                                        {t("reset")}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {spec.groups?.map((group: string, gIdx: number) => (
                                                <div key={gIdx} className="flex items-center gap-2 bg-background/50 rounded-xl p-1 px-3 border border-border/50 group/group hover:border-primary/30 transition-all shadow-sm">
                                                    <input
                                                        value={group}
                                                        onChange={(e) => updateGroupName(sIdx, gIdx, e.target.value)}
                                                        className="w-10 text-[11px] font-black bg-transparent border-none outline-none text-center uppercase p-0"
                                                    />
                                                    <button onClick={() => removeGroupFromSpecialty(sIdx, gIdx)} className="text-muted-foreground/30 hover:text-destructive lg:opacity-0 lg:group-hover/group:opacity-100 transition-opacity">
                                                        <X size={10} strokeWidth={4} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(!currentConfig.specialties || currentConfig.specialties.length === 0) && (
                        <div className="p-16 text-center rounded-[40px] bg-muted/20 border-2 border-dashed border-border/60">
                            <GraduationCap size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t("no_specialties_desc")}</p>
                            <p className="text-[9px] font-bold text-muted-foreground/40 mt-2 uppercase">{t("no_specialties_hint", { dept: currentUser?.studyField || t("current") })}</p>
                        </div>
                    )}
                </div>

                {/* ── General Groups Section ─────────────────────────── */}
                <div className="pt-12 border-t border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-2">
                        <div className="flex items-center gap-4">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground/80">{t("independent_groups")}</h4>
                            <div className="h-[2px] w-12 bg-primary/20 rounded-full hidden sm:block" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={addLevelGroup}
                                disabled={currentConfig.specialties?.length > 0}
                                className={cn(
                                    "h-10 sm:h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 sm:px-6 transition-all whitespace-nowrap",
                                    currentConfig.specialties?.length > 0
                                        ? "text-muted-foreground bg-muted/50 border border-border/50 cursor-not-allowed opacity-50 shadow-none"
                                        : "text-primary hover:bg-primary/5 border border-primary/20 hover:shadow-lg"
                                )}
                            >
                                <Plus size={16} className="mr-2" /> {t("add_group")}
                            </Button>
                            {currentConfig.groups?.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearLevelGroups}
                                    className="h-10 sm:h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 border border-destructive/10 px-4 sm:px-6 transition-all whitespace-nowrap"
                                >
                                    <Trash2 size={16} className="mr-2" /> {t("reset")}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 p-6 lg:p-10 rounded-3xl lg:rounded-[40px] bg-muted/10 border border-border/40 min-h-[140px] items-center justify-center relative group/general">
                        <div className="absolute inset-0 bg-grid-white/5 opacity-0 group-hover/general:opacity-100 transition-opacity pointer-events-none" />
                        {currentConfig.groups?.map((group: string, gIdx: number) => (
                            <div key={gIdx} className="flex items-center gap-3 bg-background rounded-2xl p-2.5 px-6 border border-border shadow-md hover:border-primary/40 transition-all hover:scale-105 active:scale-95">
                                <input
                                    value={group}
                                    onChange={(e) => updateLevelGroupName(gIdx, e.target.value)}
                                    className="w-14 text-sm font-black bg-transparent border-none outline-none text-center uppercase"
                                />
                                <button onClick={() => removeLevelGroup(gIdx)} className="text-muted-foreground/20 hover:text-destructive transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!currentConfig.groups || currentConfig.groups.length === 0) && (
                            <div className="flex-1 text-center py-6 px-12">
                                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] leading-loose max-w-sm mx-auto">
                                    {t("no_groups_desc")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Commit Logic ─────────────────────────────────── */}
                <div className="pt-8 flex flex-col items-center">
                    <Button
                        onClick={handleSave}
                        disabled={saving || JSON.stringify(currentConfig) === JSON.stringify(originalConfigs.find(c => c.level === selectedLevel))}
                        className={cn(
                            "min-w-[280px] h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 relative overflow-hidden group/save"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/save:translate-y-0 transition-transform duration-500" />
                        {saving ? (
                            <><Loader2 className="animate-spin mr-3" size={18} /> {t("sync_register")}</>
                        ) : (
                            <><Save size={18} className="mr-3" /> {t("save_params", { level: selectedLevel })}</>
                        )}
                    </Button>
                    <p className="text-center text-[9px] font-bold text-muted-foreground/40 mt-6 uppercase tracking-widest">
                        {t("admin_access_granted", { name: currentUser?.name || "System Admin" })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
