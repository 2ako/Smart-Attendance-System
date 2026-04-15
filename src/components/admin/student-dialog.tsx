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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/context";

interface StudentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student?: any;
    onSuccess: () => void;
}

const DEGREES = ["Licence", "Master"];
const LEVELS = {
    Licence: ["L1", "L2", "L3"],
    Master: ["M1", "M2"],
};

export function StudentDialog({
    open, onOpenChange, student, onSuccess }: StudentDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [academicConfigs, setAcademicConfigs] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        matricule: "",
        dateOfBirth: "",
        group: "G1",
        studyField: "",
        specialty: "",
        degree: "Licence" as "Licence" | "Master",
        level: "L1",
        academicYear: new Date().getFullYear().toString(),
    });

    useEffect(() => {
        if (open) {
            if (student) {
                setFormData({
                    firstName: student.firstName || "",
                    lastName: student.lastName || "",
                    matricule: student.matricule || "",
                    dateOfBirth: student.dateOfBirth || "",
                    group: student.group || "G1",
                    studyField: student.studyField?._id || student.studyField?._ref || student.studyField || "",
                    specialty: student.specialty || "",
                    degree: (student.degree as any) || "Licence",
                    level: student.level || "L1",
                    academicYear: student.academicYear || "",
                });
            } else {
                setFormData({
                    firstName: "",
                    lastName: "",
                    matricule: "",
                    dateOfBirth: "",
                    group: "G1",
                    studyField: currentUser?.studyField || "",
                    specialty: "",
                    degree: "Licence",
                    level: "L1",
                    academicYear: new Date().getFullYear().toString(),
                });
            }

            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => {
                    const fields = data.studyFields || [];
                    const configs = data.academicConfigs || [];
                    setStudyFields(fields);
                    setAcademicConfigs(configs);

                    if (!student && currentUser?.studyField) {
                        const match = fields.find((f: any) =>
                            f.code?.toUpperCase().trim() === currentUser.studyField?.toUpperCase().trim() ||
                            f.name?.toUpperCase().trim() === currentUser.studyField?.toUpperCase().trim()
                        );
                        if (match) {
                            setFormData(prev => ({
                                ...prev,
                                studyField: match.code,
                                specialty: ""
                            }));
                        }
                    }
                })
                .catch(err => console.error("Error fetching study fields:", err));
        }
    }, [student, open, currentUser]);

    const handleDegreeChange = (val: string) => {
        const degree = val as "Licence" | "Master";
        const currentField = studyFields.find((f: any) =>
            f.code?.toUpperCase() === formData.studyField?.toUpperCase() ||
            f._id === formData.studyField
        );
        const years = (currentField?.years && currentField.years.length > 0) ? currentField.years : LEVELS[degree];
        const defaultLevel = years.find((l: string) => {
            if (degree === "Master") return l.toUpperCase().startsWith("M");
            return l.toUpperCase().startsWith("L") || (!l.toUpperCase().startsWith("M") && !l.toUpperCase().startsWith("1"));
        }) || (degree === "Master" ? "M1" : "L1");

        setFormData({
            ...formData,
            degree,
            level: defaultLevel,
            specialty: "",
            group: ""
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const method = student ? "PUT" : "POST";
            const payload = student ? { ...formData, _id: student._id } : formData;

            const res = await fetch("/api/students", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || t("error"));
            }

            toast.success(student ? t("success_student_updated") : t("success_student_created"));
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-none p-0 bg-background shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                {student ? <User size={24} /> : <UserPlus size={24} />}
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                                {student ? t("edit_account") : t("new_student")}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 sm:px-8 py-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("first_name")}</Label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="Ammar"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("last_name")}</Label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="St"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("matricule")}</Label>
                                <Input
                                    value={formData.matricule}
                                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                    placeholder="202135001600"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("dob")}</Label>
                                <Input
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="24092002"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("study_field")}</Label>
                                {!!currentUser?.studyField ? (
                                    <div className="h-12 bg-muted/30 border-none rounded-2xl px-4 flex items-center gap-2 opacity-80">
                                        <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                            {studyFields.find((f: any) =>
                                                f.code?.toUpperCase() === formData.studyField?.toUpperCase() ||
                                                f._id === formData.studyField
                                            )?.name || formData.studyField || t("loading")}
                                        </span>
                                        <span className="ml-auto text-[8px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">Auto</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.studyField}
                                        onValueChange={(val) => setFormData({
                                            ...formData,
                                            studyField: val,
                                            specialty: ""
                                        })}
                                    >
                                        <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium">
                                            <SelectValue placeholder={t("select_field")} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                            {studyFields.map((f: any) => (
                                                <SelectItem key={f._id} value={f.code} className="rounded-xl font-medium">
                                                    {f.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("degree")}</Label>
                                <Select value={formData.degree} onValueChange={handleDegreeChange}>
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        {DEGREES.map(d => (
                                            <SelectItem key={d} value={d} className="rounded-xl">
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("level")}</Label>
                                <Select
                                    value={formData.level}
                                    onValueChange={(val) => setFormData({ ...formData, level: val, specialty: "", group: "" })}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        {(() => {
                                            const currentField = studyFields.find((f: any) =>
                                                f.code?.toUpperCase() === formData.studyField?.toUpperCase() ||
                                                f._id === formData.studyField
                                            );
                                            const databaseYears = (currentField?.years && currentField.years.length > 0)
                                                ? currentField.years
                                                : LEVELS[formData.degree];

                                            const filteredYears = databaseYears.filter((y: string) => {
                                                if (formData.degree === "Master") return y.toUpperCase().startsWith("M");
                                                if (formData.degree === "Licence") return y.toUpperCase().startsWith("L") || (!y.toUpperCase().startsWith("M") && !y.toUpperCase().startsWith("1"));
                                                return true;
                                            });

                                            return filteredYears.map((l: string) => (
                                                <SelectItem key={l} value={l} className="rounded-xl">
                                                    {l}
                                                </SelectItem>
                                            ));
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("specialty")}</Label>
                                {(() => {
                                    const matchingConfigs = academicConfigs.filter((c: any) =>
                                        c.level?.toUpperCase().trim() === formData.level?.toUpperCase().trim()
                                    );

                                    const levelConfig = matchingConfigs.sort((a: any, b: any) => {
                                        const aMatch = a.studyField?.toUpperCase().trim() === currentUser?.studyField?.toUpperCase().trim() ? 2 :
                                            (a.studyField?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ? 1 : 0);
                                        const bMatch = b.studyField?.toUpperCase().trim() === currentUser?.studyField?.toUpperCase().trim() ? 2 :
                                            (b.studyField?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ? 1 : 0);
                                        return bMatch - aMatch;
                                    })[0];

                                    const currentField = studyFields.find((f: any) =>
                                        f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                        f._id === formData.studyField
                                    );

                                    const rawSpecs = (levelConfig?.specialties && levelConfig.specialties.length > 0)
                                        ? levelConfig.specialties
                                        : (currentField?.specialties || []);

                                    const allSpecialties = Array.isArray(rawSpecs) ? rawSpecs : [];

                                    const filtered = allSpecialties.filter((s: any) => {
                                        if (!s) return false;
                                        if (typeof s === 'string') return true;
                                        if (levelConfig) return true;

                                        const sLevels = s.levels || [];
                                        if (sLevels.length === 0) return true;
                                        return sLevels.some((l: string) =>
                                            l?.toUpperCase().trim() === formData.level?.toUpperCase().trim()
                                        );
                                    }).sort((a: any, b: any) => {
                                        const nameA = (typeof a === 'string' ? a : a.name) || "";
                                        const nameB = (typeof b === 'string' ? b : b.name) || "";
                                        return nameA.localeCompare(nameB);
                                    });

                                    return (
                                        <Select
                                            value={formData.specialty || "none"}
                                            onValueChange={(val) => setFormData({ ...formData, specialty: val === "none" ? "" : val, group: "" })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium uppercase text-xs">
                                                <SelectValue placeholder={t("select_specialty")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                                <SelectItem value="none" className="rounded-xl font-medium uppercase text-xs text-muted-foreground">
                                                    {t("none_specialty")}
                                                </SelectItem>
                                                {filtered.map((s: any) => {
                                                    const specName = typeof s === 'string' ? s : s.name;
                                                    return (
                                                        <SelectItem key={specName} value={specName} className="rounded-xl font-medium uppercase text-xs">
                                                            {specName}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    );
                                })()}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("group")}</Label>
                                {(() => {
                                    const currentField = studyFields.find((f: any) =>
                                        f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                        f._id === formData.studyField
                                    );

                                    const matchingConfigs = academicConfigs.filter((c: any) =>
                                        c.level?.toUpperCase().trim() === formData.level?.toUpperCase().trim()
                                    );

                                    const levelConfig = matchingConfigs.sort((a: any, b: any) => {
                                        const aMatch = a.studyField?.toUpperCase().trim() === currentUser?.studyField?.toUpperCase().trim() ? 2 :
                                            (a.studyField?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ? 1 : 0);
                                        const bMatch = b.studyField?.toUpperCase().trim() === currentUser?.studyField?.toUpperCase().trim() ? 2 :
                                            (b.studyField?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ? 1 : 0);
                                        return bMatch - aMatch;
                                    })[0];

                                    const rawSpecs = (levelConfig?.specialties && levelConfig.specialties.length > 0)
                                        ? levelConfig.specialties
                                        : (currentField?.specialties || []);

                                    const allSpecialties = Array.isArray(rawSpecs) ? rawSpecs : [];

                                    const spec = allSpecialties.find((s: any) =>
                                        (typeof s === 'string' ? s : s.name)?.toUpperCase().trim() === formData.specialty?.toUpperCase().trim()
                                    );

                                    const isNoSpecialty = !formData.specialty || formData.specialty === "none";

                                    const groups = (!isNoSpecialty && typeof spec === 'object' && spec?.groups?.length > 0)
                                        ? spec.groups
                                        : (levelConfig?.groups && levelConfig.groups.length > 0)
                                            ? levelConfig.groups
                                            : [];

                                    return (
                                        <Select
                                            value={formData.group}
                                            onValueChange={(val) => setFormData({ ...formData, group: val })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium uppercase text-xs">
                                                <SelectValue placeholder={t("select_group")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                                {groups.map((g: string) => (
                                                    <SelectItem key={g} value={g} className="rounded-xl font-medium uppercase text-xs">
                                                        {t("group_prefix")} {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("acad_year")}</Label>
                                <Input
                                    value={formData.academicYear}
                                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="2023/2024"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-10 pt-0">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("processing")}
                                </span>
                            ) : (
                                student ? t("update_profile") : t("create_student")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
