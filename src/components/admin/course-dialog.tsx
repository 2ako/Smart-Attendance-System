// ============================================================
// CourseDialog — Unified Add/Edit Modal for Courses
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Hash, GraduationCap, Users, Calendar, UserCheck, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Subject, Professor } from "@/types";
import { useTranslation } from "@/lib/i18n/context";

interface CourseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    course?: Subject | null;
    onSuccess: () => void;
}

const DEGREES = ["Licence", "Master"];
const LEVELS = {
    Licence: ["L1", "L2", "L3"],
    Master: ["M1", "M2"],
};

export function CourseDialog({
    open, onOpenChange, course, onSuccess }: CourseDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [academicConfigs, setAcademicConfigs] = useState<any[]>([]);
    const [roomSearch, setRoomSearch] = useState("");
    const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        studyField: "",
        specialty: "",
        degree: "Licence" as "Licence" | "Master",
        level: "L1",
        type: (course?.type === "Cours") ? "Cours" : (course?.type || "Cours"),
        group: (course?.type === "Cours" || (!course && "Cours" === "Cours")) ? "All" : (course?.group || ""),
        academicYear: new Date().getFullYear().toString(),
        professorId: "",
        semester: 1,
        day: "Monday",
        startTime: "08:00",
        endTime: "10:00",
        roomId: "",
    });

    useEffect(() => {
        if (open) {
            fetchInitialData();
            if (course) {
                setFormData({
                    name: course.name,
                    code: course.code,
                    studyField: (course as any).studyField?._id || (course as any).studyField?._ref || (course as any).studyField || "",
                    specialty: course.specialty || "",
                    degree: (course as any).degree || "Licence",
                    level: (course as any).level || "L1",
                    type: course.type || "Cours",
                    group: course.group || "",
                    academicYear: course.academicYear || new Date().getFullYear().toString(),
                    professorId: (course.professor as any)?._id || "",
                    semester: (course as any).semester || 1,
                    day: course.scheduleInfo?.day || "Monday",
                    startTime: course.scheduleInfo?.startTime || "08:00",
                    endTime: course.scheduleInfo?.endTime || "10:00",
                    roomId: typeof course.scheduleInfo?.room === 'string' ? course.scheduleInfo.room : (course.scheduleInfo?.room as any)?._id || "",
                });
                setRoomSearch(typeof course.scheduleInfo?.room === 'string' ? course.scheduleInfo.room : (course.scheduleInfo?.room as any)?._id || "");
            } else {
                setFormData({
                    name: "",
                    code: "",
                    studyField: currentUser?.studyField || "",
                    specialty: "",
                    degree: "Licence",
                    level: "L1",
                    type: "Cours",
                    group: "All",
                    academicYear: new Date().getFullYear().toString(),
                    professorId: "",
                    semester: 1,
                    day: "Monday",
                    startTime: "08:00",
                    endTime: "10:00",
                    roomId: "",
                });
                setRoomSearch("");
            }

            // Fetch study fields for selection
            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => {
                    const fields = data.studyFields || [];
                    const configs = data.academicConfigs || [];
                    setStudyFields(fields);
                    setAcademicConfigs(configs);

                    if (!course && currentUser?.studyField) {
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
    }, [open, course, currentUser]);

    const fetchInitialData = async () => {
        try {
            const [profsRes, roomsRes, subsRes] = await Promise.all([
                fetch("/api/professors"),
                fetch("/api/admin/rooms"),
                fetch("/api/admin/subjects")
            ]);

            const [profsData, roomsData, subsData] = await Promise.all([
                profsRes.json(),
                roomsRes.json(),
                subsRes.json()
            ]);

            if (profsRes.ok) setProfessors(profsData.professors || []);
            if (roomsRes.ok) setRooms(roomsData.rooms || []);
            if (subsRes.ok) setAllSubjects(subsData.subjects || []);

        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        }
    };

    // Conflict Detection Logic
    const getRoomConflict = (roomName: string) => {
        if (!roomName || !formData.day || !formData.startTime || !formData.endTime) return null;

        const toNum = (t: string) => parseInt(t.replace(":", ""), 10);
        const start = toNum(formData.startTime);
        const end = toNum(formData.endTime);

        const conflict = allSubjects.find((s: any) => {
            // Skip current course if editing
            if (course && s._id === course._id) return false;

            const info = s.scheduleInfo;
            if (!info || (info.room !== roomName && (info.room as any)?._id !== roomName)) return false;
            if (info.day !== formData.day) return false;

            const sStart = toNum(info.startTime);
            const sEnd = toNum(info.endTime);

            // Conflict if: [start, end] overlaps with [sStart, sEnd]
            return (start < sEnd && end > sStart);
        });

        return conflict ? conflict.name : null;
    };


    const handleDegreeChange = (val: string) => {
        const degree = val as "Licence" | "Master";
        const currentField = studyFields.find((f: any) =>
            f.code?.toUpperCase() === formData.studyField?.toUpperCase() ||
            f._id === formData.studyField
        );
        const databaseYears = (currentField?.years && currentField.years.length > 0)
            ? currentField.years
            : LEVELS[degree];

        const defaultLevel = databaseYears.find((l: string) => {
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
        setLoading(true);

        try {
            const url = "/api/admin/subjects";
            const method = course ? "PUT" : "POST";
            const body = course ? { ...formData, _id: course._id } : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            // Strict Room Validation check before submitting
            const matchedRoom = rooms.find(r => r.name.toLowerCase() === roomSearch.toLowerCase());
            if (!matchedRoom) {
                throw new Error(t("error_invalid_room"));
            }

            // Ensure the room conflict isn't present for the final room name
            if (getRoomConflict(matchedRoom.name)) {
                throw new Error(t("error_room_occupied"));
            }

            toast.success(course ? t("success_course_updated") : t("success_course_created"));
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

                <form onSubmit={handleSubmit} className="relative z-10">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <BookOpen size={24} />
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                                {course ? t("edit_course") : t("add_new_course")}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="font-medium text-xs">
                            {course ? t("modify_course_desc") : t("register_course_desc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 sm:px-8 py-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-none">
                        <div className="grid grid-cols-1 gap-4">
                            {/* Course Name */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">
                                    {t("course_title")}
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <BookOpen size={18} />
                                    </div>
                                    <Input
                                        placeholder={t("course_title")}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Course Code */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">
                                    {t("course_code")}
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Hash size={18} />
                                    </div>
                                    <Input
                                        placeholder={t("course_code")}
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Academic Year */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">
                                    {t("academic_year")}
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Calendar size={18} />
                                    </div>
                                    <Input
                                        placeholder="2024"
                                        value={formData.academicYear}
                                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Degree & Level — BEFORE Field & Specialty so we can filter */}
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
                                                f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                                f._id === formData.studyField
                                            );

                                            const levelConfig = academicConfigs.find((c: any) => {
                                                const cField = c.studyField?.toUpperCase().trim();
                                                const matchesField =
                                                    cField === currentField?.code?.toUpperCase().trim() ||
                                                    cField === currentField?.name?.toUpperCase().trim() ||
                                                    cField === formData.studyField?.toUpperCase().trim() ||
                                                    cField === currentUser?.studyField?.toUpperCase().trim() ||
                                                    c.studyField === currentField?._id;

                                                return c.level?.toUpperCase().trim() === formData.level?.toUpperCase().trim() && matchesField;
                                            });

                                            const rawSpecs = (levelConfig?.specialties && levelConfig.specialties.length > 0)
                                                ? levelConfig.specialties
                                                : (currentField?.specialties || []);

                                            const allSpecialties = Array.isArray(rawSpecs) ? rawSpecs : [];

                                            const spec = allSpecialties.find((s: any) =>
                                                (typeof s === 'string' ? s : s.name)?.toUpperCase().trim() === formData.specialty?.toUpperCase().trim()
                                            );

                                            // Groups source logic:
                                            // 1. If a valid specialty is selected, use its groups.
                                            // 2. If 'none' or no specialty is selected, use Level-wide 'Independent Groups'.
                                            // 3. Fallback to empty (forced database reliance).
                                            const isNoSpecialty = !formData.specialty || formData.specialty === "none";

                                            const groups = (!isNoSpecialty && typeof spec === 'object' && spec?.groups?.length > 0)
                                                ? spec.groups
                                                : (levelConfig?.groups && levelConfig.groups.length > 0)
                                                    ? levelConfig.groups
                                                    : [];

                                            if (open && isNoSpecialty) {
                                                console.log("[Academic Sync] L1/Common Core Check (Course):", {
                                                    isNoSpecialty,
                                                    levelGroupsFound: levelConfig?.groups?.length || 0
                                                });
                                            }
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

                        {/* Field & Specialty */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("study_field")}</Label>
                                {!!currentUser?.studyField ? (
                                    <div className="h-12 bg-muted/30 border-none rounded-2xl px-4 flex items-center gap-2 opacity-80">
                                        <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                            {studyFields.find((f: any) =>
                                                f.code?.toUpperCase() === formData.studyField?.toUpperCase() || f._id === formData.studyField || f._id === formData.studyField ||
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
                                            specialty: "",
                                            group: ""
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
                                        f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                        f._id === formData.studyField
                                    );

                                    // Final Case-Insensitive Session Match: Links faculty admin's department to 'Independent Groups'
                                    const levelConfig = academicConfigs.find((c: any) =>
                                        c.level?.toUpperCase().trim() === formData.level?.toUpperCase().trim() &&
                                        (
                                            c.studyField?.toUpperCase().trim() === currentUser?.studyField?.toUpperCase().trim() ||
                                            c.studyField?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim()
                                        )
                                    );

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
                                                    {t("no_specialty_common_core")}
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

                        {/* Type & Group */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("type")}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => {
                                        const newGroup = val === "Cours" ? "All" : (formData.group === "All" ? "" : formData.group);
                                        setFormData({ ...formData, type: val as any, group: newGroup });
                                    }}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={18} className="text-muted-foreground" />
                                            <SelectValue placeholder={t("select_type")} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        <SelectItem value="Cours" className="rounded-xl focus:bg-primary/5 focus:text-primary">{t("format_lecture")}</SelectItem>
                                        <SelectItem value="TD" className="rounded-xl focus:bg-primary/5 focus:text-primary">{t("format_tutorial")}</SelectItem>
                                        <SelectItem value="TP" className="rounded-xl focus:bg-primary/5 focus:text-primary">{t("format_lab")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("group")}</Label>
                                {(() => {
                                    const currentField = studyFields.find((f: any) =>
                                        f.code?.toUpperCase().trim() === formData.studyField?.toUpperCase().trim() ||
                                        f._id === formData.studyField
                                    );

                                    // Prioritized Match: Filter by Level, then sort so session-scoped config comes first
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

                                    return formData.type === "Cours" ? (
                                        <div className="h-12 bg-primary/5 border-2 border-primary/20 rounded-2xl px-4 flex items-center gap-2 group shadow-sm transition-all animate-in fade-in zoom-in duration-300">
                                            <Users size={18} className="text-primary" />
                                            <span className="text-xs font-black uppercase tracking-widest text-primary">{t("all_groups_concerned")}</span>
                                            <Badge variant="outline" className="ltr:ml-auto rtl:mr-auto border-primary/30 text-[8px] font-bold text-primary px-1.5 py-0">AUTO</Badge>
                                        </div>
                                    ) : (
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
                                                        {t("group")} {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )
                                })()}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("filter_professor")}</Label>
                                <Select
                                    value={formData.professorId}
                                    onValueChange={(val) => setFormData({ ...formData, professorId: val })}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={18} className="text-muted-foreground" />
                                            <SelectValue placeholder={t("select_placeholder")} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        {professors.map((p) => (
                                            <SelectItem key={p._id} value={p._id} className="rounded-xl focus:bg-primary/5 focus:text-primary">
                                                {p.user ? (p.user as any).name : t("unknown")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Scheduling Section */}
                        <div className="pt-4 border-t border-border/50">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 mb-4 block">
                                {t("scheduling_details")}
                            </Label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("semester")}</Label>
                                    <Select
                                        value={formData.semester.toString()}
                                        onValueChange={(val) => setFormData({ ...formData, semester: parseInt(val) })}
                                    >
                                        <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                            <SelectItem value="1" className="rounded-xl">{t("semester")} 1</SelectItem>
                                            <SelectItem value="2" className="rounded-xl">{t("semester")} 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("day")}</Label>
                                    <Select
                                        value={formData.day}
                                        onValueChange={(val) => setFormData({ ...formData, day: val })}
                                    >
                                        <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                                                <SelectItem key={d} value={d} className="rounded-xl">{t(d.toLowerCase())}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("start_time")}</Label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("end_time")}</Label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                            </div>

                            {/* Enhanced Room Selection */}
                            <div className="space-y-2 mt-4 relative">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("classroom_room")}</Label>
                                <div className="relative group z-[20]">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <MapPin size={18} />
                                    </div>
                                    <Input
                                        placeholder={t("search_rooms")}
                                        value={roomSearch}
                                        onChange={(e) => {
                                            setRoomSearch(e.target.value);
                                            setFormData({ ...formData, roomId: e.target.value });
                                            setIsRoomDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsRoomDropdownOpen(true)}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                        required
                                    />

                                    {/* Availability Status Badge logic restricted to system rooms only */}
                                    {roomSearch && (
                                        <div className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                            {(() => {
                                                const matchedRoom = rooms.find(r => r.name.toLowerCase() === roomSearch.toLowerCase());
                                                if (!matchedRoom) return null; // Only show status for rooms that exist in system

                                                const conflict = getRoomConflict(matchedRoom.name);
                                                if (conflict) {
                                                    return (
                                                        <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg border border-destructive/20 animate-pulse">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                                            <span className="text-[10px] font-bold uppercase tracking-tight">{t("unavailable")}</span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                        <span className="text-[10px] font-bold uppercase tracking-tight">{t("available")}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Selection Dropdown */}
                                {isRoomDropdownOpen && (
                                    <>
                                        {/* Localized backdrop to allow closing by clicking outside, with careful Z-index */}
                                        <div
                                            className="fixed inset-0 z-[15]"
                                            onClick={() => setIsRoomDropdownOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-background border border-border shadow-2xl rounded-2xl z-[25] max-h-60 overflow-y-auto scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
                                            {rooms
                                                .filter(r =>
                                                    r.name.toLowerCase().includes(roomSearch.toLowerCase())
                                                )
                                                .map(room => {
                                                    const conflict = getRoomConflict(room.name);
                                                    return (
                                                        <button
                                                            key={room._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setRoomSearch(room.name);
                                                                setFormData({ ...formData, roomId: room.name });
                                                                setIsRoomDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="font-bold text-sm text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{room.name}</p>
                                                            </div>
                                                            <div className="ml-4 ltr:text-left rtl:text-right">
                                                                {conflict ? (
                                                                    <div className="ltr:text-right rtl:text-left">
                                                                        <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg border border-destructive/20">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                                                            <span className="text-[10px] font-bold uppercase tracking-tight">{t("unavailable")}</span>
                                                                        </div>
                                                                        <p className="text-[9px] text-destructive/60 mt-1 font-medium">{t("conflicting_with")}: {conflict}</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-tight">{t("available")}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}

                                            {rooms.length > 0 && rooms.filter(r =>
                                                r.name.toLowerCase().includes(roomSearch.toLowerCase())
                                            ).length === 0 && (
                                                    <div className="p-4 text-center">
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                            {t("no_rooms_matching")} "{roomSearch}"
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2 text-[10px] font-black uppercase text-primary"
                                                            onClick={() => setIsRoomDropdownOpen(false)}
                                                        >
                                                            {t("use_custom_room")}
                                                        </Button>
                                                    </div>
                                                )}

                                            {rooms.length === 0 && (
                                                <div className="p-4 text-center">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                        {t("no_rooms_registered")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 pt-4 flex-col-reverse sm:flex-row gap-3 bg-muted/20">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    {t("loading")}
                                </span>
                            ) : (
                                course ? t("save") : t("confirm")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
