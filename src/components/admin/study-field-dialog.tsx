"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, X, GraduationCap, Settings2, Layers, Tag } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SpecialtyData {
    name: string;
    levels: string[];
    groups: string[];
}

interface StudyFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studyField?: any;
    onSuccess: () => void;
}

export function StudyFieldDialog({
    open,
    onOpenChange,
    studyField,
    onSuccess,
}: StudyFieldDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        systemType: "LMD",
        years: [] as string[],
        specialties: [] as SpecialtyData[],
    });

    useEffect(() => {
        if (open) {
            if (studyField) {
                setFormData({
                    name: studyField.name || "",
                    code: studyField.code || "",
                    systemType: studyField.systemType || "LMD",
                    years: studyField.years || [],
                    specialties: (studyField.specialties || []).map((s: any) =>
                        typeof s === 'string'
                            ? { name: s, levels: [], groups: [] }
                            : { name: s.name || "", levels: s.levels || [], groups: s.groups || [] }
                    ),
                });
            } else {
                setFormData({
                    name: "",
                    code: "",
                    systemType: "LMD",
                    years: ["L1", "L2", "L3", "M1", "M2"],
                    specialties: [],
                });
            }
        }
    }, [open, studyField]);

    const handleSystemTypeChange = (val: string) => {
        const defaultYears = val === "LMD" ? ["L1", "L2", "L3", "M1", "M2"] : [t("lvl_1st_year"), t("lvl_2nd_year"), t("lvl_3rd_year"), t("lvl_4th_year"), t("lvl_5th_year")];
        setFormData({ ...formData, systemType: val, years: defaultYears });
    };

    const addYear = () => {
        setFormData({ ...formData, years: [...formData.years, `${t("level")} ${formData.years.length + 1}`] });
    };

    const removeYear = (index: number) => {
        setFormData({ ...formData, years: formData.years.filter((_, i) => i !== index) });
    };

    const updateYear = (index: number, value: string) => {
        const newYears = [...formData.years];
        newYears[index] = value;
        setFormData({ ...formData, years: newYears });
    };

    // ── Specialty helpers ──
    const addSpecialty = () => {
        setFormData({ ...formData, specialties: [...formData.specialties, { name: "", levels: [], groups: [] }] });
    };

    const removeSpecialty = (index: number) => {
        setFormData({ ...formData, specialties: formData.specialties.filter((_, i) => i !== index) });
    };

    const updateSpecialtyName = (index: number, value: string) => {
        const newSpecs = [...formData.specialties];
        newSpecs[index] = { ...newSpecs[index], name: value.toUpperCase() };
        setFormData({ ...formData, specialties: newSpecs });
    };

    const toggleSpecialtyLevel = (specIndex: number, level: string) => {
        const newSpecs = [...formData.specialties];
        const currentLevels = newSpecs[specIndex].levels || [];
        if (currentLevels.includes(level)) {
            newSpecs[specIndex] = { ...newSpecs[specIndex], levels: currentLevels.filter(l => l !== level) };
        } else {
            newSpecs[specIndex] = { ...newSpecs[specIndex], levels: [...currentLevels, level] };
        }
        setFormData({ ...formData, specialties: newSpecs });
    };

    const addGroup = (specIndex: number) => {
        const newSpecs = [...formData.specialties];
        const currentGroups = newSpecs[specIndex].groups || [];
        newSpecs[specIndex] = {
            ...newSpecs[specIndex],
            groups: [...currentGroups, `G${currentGroups.length + 1}`]
        };
        setFormData({ ...formData, specialties: newSpecs });
    };

    const removeGroup = (specIndex: number, groupIndex: number) => {
        const newSpecs = [...formData.specialties];
        newSpecs[specIndex] = {
            ...newSpecs[specIndex],
            groups: newSpecs[specIndex].groups.filter((_, i) => i !== groupIndex)
        };
        setFormData({ ...formData, specialties: newSpecs });
    };

    const updateGroupName = (specIndex: number, groupIndex: number, value: string) => {
        const newSpecs = [...formData.specialties];
        const newGroups = [...newSpecs[specIndex].groups];
        newGroups[groupIndex] = value.toUpperCase();
        newSpecs[specIndex] = { ...newSpecs[specIndex], groups: newGroups };
        setFormData({ ...formData, specialties: newSpecs });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const method = studyField ? "PUT" : "POST";
            const body = studyField ? { ...formData, _id: studyField._id } : formData;

            const res = await fetch("/api/admin/study-fields", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast.success(studyField ? t("success_student_updated") : t("success_student_created"));
                onSuccess();
                onOpenChange(false);
            } else {
                const data = await res.json();
                throw new Error(data.message || "Operation failed");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl p-0 overflow-hidden bg-card">
                <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
                    <div className="p-8 pb-6 border-b border-border/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <GraduationCap size={20} />
                                </div>
                                <div className="flex-1">
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                                        {studyField ? t("edit_field") : t("new_field")}
                                    </DialogTitle>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                        {t("university_structure")}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 overflow-y-auto scrollbar-none flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("full_name")}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="h-12 rounded-xl bg-muted/50 border-none px-4 font-bold focus-visible:ring-1 focus-visible:ring-primary"
                                    placeholder={t("specialty_placeholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("code_label")}{t("code_label_hint")}</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    className="h-12 rounded-xl bg-muted/50 border-none px-4 font-bold focus-visible:ring-1 focus-visible:ring-primary"
                                    placeholder={t("code_placeholder")}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("academic_system")}</Label>
                            <Select value={formData.systemType} onValueChange={handleSystemTypeChange}>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-none font-bold text-xs">
                                    <SelectValue placeholder={t("academic_system")} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="LMD" className="font-bold text-xs py-3 text-foreground">{t("lmd_system_desc")}</SelectItem>
                                    <SelectItem value="CLASSIC" className="font-bold text-xs py-3 text-foreground">{t("classic_system_desc")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Settings2 size={12} className="text-primary" />
                                    {t("academic_system")}
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addYear}
                                    className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 gap-1"
                                >
                                    <Plus size={12} /> {t("add_level")}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {formData.years.map((year, index) => (
                                    <div key={index} className="flex gap-2 group animate-in zoom-in-95 duration-200">
                                        <div className="relative flex-1">
                                            <Input
                                                value={year}
                                                onChange={(e) => updateYear(index, e.target.value)}
                                                className="h-10 rounded-xl bg-background border-border/50 px-3 font-bold text-xs focus-visible:ring-primary"
                                                placeholder={`${t("level")} ${index + 1}`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeYear(index)}
                                            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {formData.years.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("no_levels_defined")}</p>
                                </div>
                            )}
                        </div>

                        {/* Specialties Section */}
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Layers size={12} className="text-primary" />
                                    {t("specialty")}{t("groups_hint")}
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addSpecialty}
                                    className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 gap-1"
                                >
                                    <Plus size={12} /> {t("add_specialty")}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {formData.specialties.map((spec, specIndex) => (
                                    <div key={specIndex} className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex gap-2 items-center">
                                            <div className="relative flex-1">
                                                <Input
                                                    value={spec.name}
                                                    onChange={(e) => updateSpecialtyName(specIndex, e.target.value)}
                                                    className="h-10 rounded-xl bg-background border-border/50 px-3 font-bold text-xs focus-visible:ring-primary uppercase"
                                                    placeholder={t("specialty_name_placeholder")}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeSpecialty(specIndex)}
                                                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>

                                        {/* Level Assignment */}
                                        <div className="space-y-2 pl-4 border-l-2 border-blue-500/20">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                                                <Tag size={10} className="text-blue-500" />
                                                {t("assigned_levels_hint")}
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {formData.years.map((year) => {
                                                    const isActive = (spec.levels || []).includes(year);
                                                    return (
                                                        <button
                                                            key={year}
                                                            type="button"
                                                            onClick={() => toggleSpecialtyLevel(specIndex, year)}
                                                            className={`h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isActive
                                                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                                }`}
                                                        >
                                                            {year}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(spec.levels || []).length === 0 && (
                                                <p className="text-[9px] text-muted-foreground/50 italic">
                                                    {t("no_levels_specialty_hint")}
                                                </p>
                                            )}
                                        </div>

                                        {/* Groups */}
                                        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{t("groups")}</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => addGroup(specIndex)}
                                                    className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 gap-1"
                                                >
                                                    <Plus size={10} /> {t("add_group")}
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {(spec.groups || []).map((group, groupIndex) => (
                                                    <div key={groupIndex} className="flex gap-1 items-center">
                                                        <Input
                                                            value={group}
                                                            onChange={(e) => updateGroupName(specIndex, groupIndex, e.target.value)}
                                                            className="h-8 rounded-lg bg-background border-border/50 px-2 font-bold text-[10px] focus-visible:ring-primary uppercase"
                                                            placeholder="G1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeGroup(specIndex, groupIndex)}
                                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/5 hover:text-destructive shrink-0"
                                                        >
                                                            <X size={12} />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {formData.specialties.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl group-hover:border-primary/20 transition-colors">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("no_specialties_defined")}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl px-6 font-bold uppercase tracking-widest text-[10px]"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !formData.name || !formData.code || formData.years.length === 0}
                            className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : (studyField ? t("save_changes") : t("create_field"))}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
