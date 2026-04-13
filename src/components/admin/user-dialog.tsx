// ============================================================
// UserDialog — Modal for Managing System Accounts
// ============================================================

"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserCog, User, Mail, Key, Fingerprint } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userAccount?: any;
    onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, userAccount, onSuccess }: UserDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [academicConfigs, setAcademicConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "", // Full name for Admins
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        role: "student",
        studyField: "",
        student: {
            matricule: "",
            dateOfBirth: "",
            level: "L1",
            degree: "Licence",
            specialty: "",
            group: "G1",
            academicYear: new Date().getFullYear().toString(),
        },
        professor: {
            employeeId: `EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            department: "",
            specialization: "",
            rfidUid: "",
        }
    });

    useEffect(() => {
        if (open) {
            if (userAccount) {
                setFormData({
                    name: userAccount.name || "",
                    firstName: userAccount.student?.firstName || userAccount.professor?.firstName || (userAccount.role !== 'admin' ? userAccount.name?.split(" ")[0] : "") || "",
                    lastName: userAccount.student?.lastName || userAccount.professor?.lastName || (userAccount.role !== 'admin' ? userAccount.name?.split(" ").slice(1).join(" ") : "") || "",
                    username: userAccount.username || "",
                    email: userAccount.email || "",
                    password: "",
                    role: userAccount.role || "student",
                    studyField: userAccount.studyField?._id || userAccount.studyField?._ref || userAccount.studyField || "",
                    student: userAccount.student || { matricule: "", dateOfBirth: "", degree: "Licence", level: "L1", specialty: "", group: "", academicYear: "" },
                    professor: userAccount.professor || { employeeId: "", department: "", specialization: "", rfidUid: "" },
                });
            } else {
                setFormData({
                    name: "",
                    firstName: "",
                    lastName: "",
                    username: "",
                    email: "",
                    password: "",
                    role: "student",
                    studyField: currentUser?.studyField || "",
                    student: { matricule: "", dateOfBirth: "", degree: "Licence", level: "L1", specialty: "", group: "", academicYear: "" },
                    professor: { employeeId: "", department: currentUser?.studyField || "", specialization: "", rfidUid: "" },
                });
            }

            // Fetch study fields for the selection
            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => {
                    const fields = data.studyFields || [];
                    const configs = data.academicConfigs || [];
                    setStudyFields(fields);
                    setAcademicConfigs(configs);

                    if (!userAccount && currentUser?.studyField) {
                        const match = fields.find((f: any) =>
                            f.code?.toUpperCase().trim() === currentUser.studyField?.toUpperCase().trim() ||
                            f.name?.toUpperCase().trim() === currentUser.studyField?.toUpperCase().trim()
                        );
                        if (match) {
                            setFormData(prev => ({
                                ...prev,
                                studyField: match.code,
                                student: { ...prev.student, specialty: "" }
                            }));
                        }
                    }
                })
                .catch(err => console.error("Error fetching study fields:", err));
        }
    }, [open, userAccount, currentUser]);

    // Role-based Auto-Generation Logic
    useEffect(() => {
        if (open && formData.role === "professor" && !formData.professor.employeeId) {
            const randomId = `PROF-${Math.floor(1000 + Math.random() * 9000)}`;
            setFormData(prev => ({
                ...prev,
                professor: { ...prev.professor, employeeId: randomId }
            }));
        }
    }, [open, formData.role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = "/api/admin/users";
            const method = userAccount ? "PUT" : "POST";
            const body = userAccount ? { ...formData, _id: userAccount._id } : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            toast.success(userAccount ? t("success_user_updated") : t("success_user_created"));
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-none p-0 bg-background shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10 text-start">
                    <DialogHeader className="p-8 pb-4 text-start">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <UserCog size={24} />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase text-start">
                                {userAccount ? t("edit_account") : t("new_account")}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest leading-relaxed text-start">
                            {userAccount ? `${t("edit_account")} ${userAccount.username}` : t("new_account")}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Role Selector At Top */}
                    <div className="px-8 pb-4">
                        <div className="p-1.5 bg-muted/30 rounded-2xl border border-border/50 flex items-center gap-2">
                            {['student', 'professor', 'admin'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: r })}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        formData.role === r
                                            ? "bg-background text-primary shadow-sm border border-border/50 scale-[1.02]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    {t("role_" + r)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-8 py-4 space-y-5 max-h-[50vh] overflow-y-auto scrollbar-none border-t border-border/10 text-start">
                        {formData.role === "admin" ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("admin_type")}</Label>
                                    <Select value={formData.studyField ? "limited" : "super"} onValueChange={(v) => setFormData({ ...formData, studyField: v === "super" ? "" : "INFO" })}>
                                        <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                            <SelectItem value="super" className="rounded-xl font-medium">{t("super_admin_global")}</SelectItem>
                                            <SelectItem value="limited" className="rounded-xl font-medium">{t("faculty_admin_scoped")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.studyField && (
                                    <div className="space-y-2 animate-in zoom-in-95 duration-200">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("administrative_scope")}</Label>
                                        <Select
                                            value={formData.studyField}
                                            onValueChange={(val) => setFormData({ ...formData, studyField: val })}
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
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("full_admin_name")}</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                            <User size={18} />
                                        </div>
                                        <Input
                                            placeholder={t("full_admin_name")}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : formData.role === "student" ? (
                            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("first_name")}</Label>
                                        <Input
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value, name: `${e.target.value} ${formData.lastName}` })}
                                            placeholder={t("first_name")}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("last_name")}</Label>
                                        <Input
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value, name: `${formData.firstName} ${e.target.value}` })}
                                            className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                            placeholder={t("last_name")}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Registration & DOB */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("matricule")}</Label>
                                        <Input
                                            value={formData.student.matricule || ""}
                                            onChange={(e) => setFormData({ ...formData, student: { ...formData.student, matricule: e.target.value } })}
                                            className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                            placeholder="202135001600"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("dob")}</Label>
                                        <Input
                                            value={formData.student.dateOfBirth || ""}
                                            onChange={(e) => setFormData({ ...formData, student: { ...formData.student, dateOfBirth: e.target.value } })}
                                            className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                            placeholder="24092002"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Degree & Level — BEFORE Field & Specialty so we can filter */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("degree")}</Label>
                                        <Select
                                            value={formData.student.degree}
                                            onValueChange={(val) => {
                                                const currentField = studyFields.find((f: any) =>
                                                    f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                                    f._id === formData.studyField
                                                );

                                                const databaseYears = (currentField?.years && currentField.years.length > 0)
                                                    ? currentField.years
                                                    : (val === "Master" ? ["M1", "M2"] : ["L1", "L2", "L3"]);

                                                const defaultLevel = databaseYears.find((l: string) => {
                                                    if (val === "Master") return l.toUpperCase().startsWith("M");
                                                    return l.toUpperCase().startsWith("L") || (!l.toUpperCase().startsWith("M") && !l.toUpperCase().startsWith("1"));
                                                }) || (val === "Master" ? "M1" : "L1");

                                                setFormData({
                                                    ...formData,
                                                    student: {
                                                        ...formData.student,
                                                        degree: val as any,
                                                        level: defaultLevel,
                                                        specialty: "",
                                                        group: ""
                                                    }
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                                <SelectItem value="Licence" className="rounded-xl">{t("licence")}</SelectItem>
                                                <SelectItem value="Master" className="rounded-xl">{t("master")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("level")}</Label>
                                        <Select
                                            value={formData.student.level}
                                            onValueChange={(val) => setFormData({
                                                ...formData,
                                                student: {
                                                    ...formData.student,
                                                    level: val,
                                                    specialty: "",
                                                    group: ""
                                                }
                                            })}
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
                                                        : (formData.student.degree === "Master" ? ["M1", "M2"] : ["L1", "L2", "L3"]);

                                                    const filteredYears = databaseYears.filter((y: string) => {
                                                        if (!y) return false;
                                                        if (formData.student.degree === "Master") return y.toUpperCase().startsWith("M");
                                                        if (formData.student.degree === "Licence") return y.toUpperCase().startsWith("L") || (!y.toUpperCase().startsWith("M") && !y.toUpperCase().startsWith("1"));
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

                                {/* Field & Specialty */}
                                <div className="grid grid-cols-2 gap-4">
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
                                                <span className="ml-auto text-[8px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">{t("auto")}</span>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.studyField}
                                                onValueChange={(val) => setFormData({
                                                    ...formData,
                                                    studyField: val,
                                                    student: { ...formData.student, specialty: "", group: "" }
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
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("specialty")}</Label>
                                        {(() => {
                                            const currentField = studyFields.find((f: any) =>
                                                f.code?.toUpperCase()?.trim() === formData.studyField?.toUpperCase()?.trim() ||
                                                f._id === formData.studyField
                                            );

                                            // Prioritized Match: Filter by Level, then sort so session-scoped config comes first
                                            const matchingConfigs = academicConfigs.filter((c: any) =>
                                                c.level?.toUpperCase().trim() === formData.student.level?.toUpperCase().trim()
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

                                            // Filter by Level (only for studyField fallbacks)
                                            const filtered = allSpecialties.filter((s: any) => {
                                                if (!s) return false;
                                                if (typeof s === 'string') return true;
                                                if (levelConfig) return true;

                                                const sLevels = s.levels || [];
                                                if (sLevels.length === 0) return true;
                                                return sLevels.some((l: string) =>
                                                    l?.toUpperCase().trim() === formData.student.level?.toUpperCase().trim()
                                                );
                                            }).sort((a: any, b: any) => {
                                                const nameA = (typeof a === 'string' ? a : a.name) || "";
                                                const nameB = (typeof b === 'string' ? b : b.name) || "";
                                                return nameA.localeCompare(nameB);
                                            });

                                            return (
                                                <Select
                                                    value={formData.student.specialty || "none"}
                                                    onValueChange={(val) => setFormData({
                                                        ...formData,
                                                        student: {
                                                            ...formData.student,
                                                            specialty: val === "none" ? "" : val,
                                                            group: ""
                                                        }
                                                    })}
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
                                </div>

                                {/* Group & Year */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("group")}</Label>
                                        {(() => {
                                            const currentField = studyFields.find((f: any) =>
                                                f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                                f._id === formData.studyField
                                            );

                                            // Prioritized Match: Filter by Level, then sort so session-scoped config comes first
                                            const matchingConfigs = academicConfigs.filter((c: any) =>
                                                c.level?.toUpperCase().trim() === formData.student.level?.toUpperCase().trim()
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
                                                (typeof s === 'string' ? s : s.name)?.toUpperCase().trim() === formData.student.specialty?.toUpperCase().trim()
                                            );

                                            // Groups source logic:
                                            // 1. If a valid specialty is selected, use its groups.
                                            // 2. If 'none' or no specialty is selected, use Level-wide 'Independent Groups'.
                                            // 3. Fallback to empty (forced database reliance).
                                            const isNoSpecialty = !formData.student.specialty || formData.student.specialty === "none";

                                            const groups = (!isNoSpecialty && typeof spec === 'object' && spec?.groups?.length > 0)
                                                ? spec.groups
                                                : (levelConfig?.groups && levelConfig.groups.length > 0)
                                                    ? levelConfig.groups
                                                    : [];

                                            if (open && isNoSpecialty) {
                                                console.log("[Academic Sync] L1/Common Core Check:", {
                                                    isNoSpecialty,
                                                    levelGroupsFound: levelConfig?.groups?.length || 0
                                                });
                                            }

                                            return (
                                                <Select
                                                    value={formData.student.group || ""}
                                                    onValueChange={(val) => setFormData({ ...formData, student: { ...formData.student, group: val } })}
                                                >
                                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium">
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
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("acad_year")}</Label>
                                        <Input
                                            value={formData.student.academicYear || ""}
                                            onChange={(e) => setFormData({ ...formData, student: { ...formData.student, academicYear: e.target.value } })}
                                            className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                            placeholder="2023/2024"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Professor Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("first_name")}</Label>
                                        <Input
                                            value={formData.firstName || ""}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value, name: `${e.target.value} ${formData.lastName}` })}
                                            placeholder={t("first_name")}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("last_name")}</Label>
                                        <Input
                                            value={formData.lastName || ""}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value, name: `${formData.firstName} ${e.target.value}` })}
                                            className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                            placeholder={t("last_name")}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("employee_id")}</Label>
                                    <Input
                                        value={formData.professor.employeeId}
                                        className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono opacity-70"
                                        readOnly
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("department")}</Label>
                                    <Select value={formData.studyField} onValueChange={(val) => setFormData({ ...formData, studyField: val, professor: { ...formData.professor, department: val } })}>
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
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("specialization")}</Label>
                                    <Input
                                        value={formData.professor.specialization || ""}
                                        onChange={(e) => setFormData({ ...formData, professor: { ...formData.professor, specialization: e.target.value } })}
                                        placeholder={t("specialization")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("rfid_uid")}</Label>
                                    <Input
                                        value={formData.professor.rfidUid || ""}
                                        onChange={(e) => setFormData({ ...formData, professor: { ...formData.professor, rfidUid: e.target.value } })}
                                        className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                        placeholder={t("rfid_uid")}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Common Credentials Section */}
                        <div className="pt-4 mt-4 border-t border-border/50 space-y-5 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary block mb-2 ltr:px-1 rtl:px-1">{t("system_credentials")}</Label>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("username_id")}</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                            <Fingerprint size={18} />
                                        </div>
                                        <Input
                                            placeholder="user.one"
                                            value={formData.username || ""}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("email_address")}</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <Input
                                        type="email"
                                        placeholder={t("email_address")}
                                        value={formData.email || ""}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">
                                    {userAccount ? t("change_password") : t("access_password")}
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Key size={18} />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder={userAccount ? t("change_password") : t("access_password")}
                                        value={formData.password || ""}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 px-6"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    {t("loading")}
                                </span>
                            ) : (
                                t("confirm")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
