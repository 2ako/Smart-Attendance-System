"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Calendar,
    BookOpen,
    FileText,
    Shield,
    User,
    Download,
    Upload,
    X,
    Loader2,
    Users,
    Target,
    PencilLine,
    Eye,
    Search,
    Check,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/hooks/use-auth";

interface AdminAnnouncementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    announcement?: any;
    initialMode?: "view" | "edit";
    onSuccess: () => void;
    subjects: any[];
}

export function AdminAnnouncementDialog({
    open,
    onOpenChange,
    announcement,
    initialMode = "edit",
    onSuccess,
    subjects
}: AdminAnnouncementDialogProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(initialMode === "edit");
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [academicConfigs, setAcademicConfigs] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subjectId: "",
        targetType: user?.studyField ? "cohort" : "global",
        targetAudience: user?.studyField ? "students" : "faculty_admins",
        targetFacultyIds: [] as string[],
        level: "",
        specialty: "",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        status: "published",
        targetStudentIds: [] as string[],
    });

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

    const isSuperAdmin = !user?.studyField;
    const isOwner = announcement?.studyField === user?.studyField;

    useEffect(() => {
        if (open) {
            fetchStudyFields();
            if (announcement) {
                // Determine mode: view for others' announcements, initialMode for own.
                setIsEditMode(isOwner ? (initialMode === "edit") : false);
                setFormData({
                    title: announcement.title || "",
                    description: announcement.description || "",
                    subjectId: announcement.subject?._id || announcement.subjectId || "",
                    targetType: announcement.targetType || "cohort",
                    targetAudience: announcement.targetAudience || (user?.studyField ? "students" : "faculty_admins"),
                    targetFacultyIds: announcement.targetFaculties?.map((f: any) => f._id) || (announcement.targetFaculty?._id ? [announcement.targetFaculty._id] : []),
                    level: announcement.level || "",
                    specialty: announcement.specialty || "",
                    dueDate: announcement.dueDate ? new Date(announcement.dueDate).toISOString().slice(0, 16) : formData.dueDate,
                    status: announcement.status || "published",
                    targetStudentIds: announcement.targetStudents?.map((s: any) => s._id) || [],
                });
                setExistingAttachments(announcement.attachments || []);
            } else {
                setIsEditMode(true);
                setFormData({
                    title: "",
                    description: "",
                    subjectId: "",
                    targetType: isSuperAdmin ? "global" : "cohort",
                    targetAudience: isSuperAdmin ? "faculty_admins" : "students",
                    targetFacultyIds: [],
                    level: "",
                    specialty: "",
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                    status: "published",
                    targetStudentIds: [],
                });
                setExistingAttachments([]);
            }
            setSelectedFiles([]);
        }
    }, [open, announcement, user]);

    useEffect(() => {
        if (open && formData.targetType === "individual") {
            fetchStudents();
        }
    }, [open, formData.targetType, formData.targetFacultyIds]);

    const fetchStudyFields = async () => {
        try {
            const res = await fetch("/api/admin/study-fields");
            if (res.ok) {
                const data = await res.json();
                setStudyFields(data.studyFields || []);
                setAcademicConfigs(data.academicConfigs || []);
            }
        } catch (error) {
            console.error("Error fetching study fields:", error);
        }
    };

    const fetchStudents = async () => {
        try {
            const fieldParam = formData.targetFacultyIds.length > 0 ? `&studyField=${formData.targetFacultyIds[0]}` : "";
            const res = await fetch(`/api/students?limit=100${fieldParam}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append("title", formData.title);
            data.append("description", formData.description);
            data.append("targetType", formData.targetType);
            data.append("targetAudience", formData.targetAudience);
            data.append("dueDate", new Date(formData.dueDate).toISOString());
            data.append("status", formData.status);
            data.append("type", "affichage");

            const finalFacultyIds = isSuperAdmin ? formData.targetFacultyIds : [user.studyField];
            if (finalFacultyIds.length > 0) {
                data.append("targetFacultyIds", JSON.stringify(finalFacultyIds));
            }

            if (formData.targetType === "cohort") {
                if (formData.level) data.append("level", formData.level);
                if (formData.specialty && formData.specialty !== "all_specialties") {
                    data.append("specialty", formData.specialty);
                }
            } else if (formData.targetType === "individual") {
                data.append("targetStudents", JSON.stringify(formData.targetStudentIds));
            }

            if (announcement?._id) {
                data.append("_id", announcement._id);
            }

            selectedFiles.forEach((file) => {
                data.append("files", file);
            });

            data.append("existingAttachments", JSON.stringify(existingAttachments));

            const method = announcement ? "PUT" : "POST";
            const res = await fetch("/api/admin/announcements", {
                method,
                body: data,
            });

            if (res.ok) {
                toast.success(announcement ? t("announcement_updated") : t("announcement_published"));
                onSuccess();
                onOpenChange(false);
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to save announcement");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (id: string) => {
        setFormData(prev => ({
            ...prev,
            targetStudentIds: prev.targetStudentIds.includes(id)
                ? prev.targetStudentIds.filter(sid => sid !== id)
                : [...prev.targetStudentIds, id]
        }));
    };

    const toggleFaculty = (id: string) => {
        setFormData(prev => ({
            ...prev,
            targetFacultyIds: prev.targetFacultyIds.includes(id)
                ? prev.targetFacultyIds.filter(fid => fid !== id)
                : [...prev.targetFacultyIds, id]
        }));
    };

    const isViewMode = announcement && !isEditMode;
    const filteredStudents = students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    // Get the CODE of the currently selected study field
    const currentCode = isSuperAdmin ?
        (formData.targetFacultyIds.length === 1 ? studyFields.find(f => f._id === formData.targetFacultyIds[0])?.code : null)
        : user?.studyField;

    // Filter academic configs matching this code (and the level if selected)
    const configsForField = academicConfigs.filter(ac =>
        ac.studyField === currentCode &&
        (!formData.level || ac.level === formData.level)
    );

    // Extract all available specialties from these configs
    const availableSpecialties = Array.from(new Set(configsForField.flatMap(ac => ac.specialties || []))).sort();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[95vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 bg-card/95 backdrop-blur-xl scrollbar-none text-start">

                {/* ── Dynamic Header ── */}
                <div className={cn(
                    "relative h-20 sm:h-28 p-5 sm:p-8 flex flex-col justify-center text-start transition-all duration-500",
                    isViewMode
                        ? "bg-gradient-to-br from-primary via-primary/80 to-primary/40"
                        : "bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400"
                )}>
                    <div className="absolute top-0 ltr:right-0 rtl:left-0 p-6 opacity-20 ltr:rotate-12 rtl:-rotate-12">
                        {isViewMode ? <Shield size={80} className="text-white" /> : <PencilLine size={80} className="text-white" />}
                    </div>

                    <div className="flex items-center justify-between relative z-10 w-full text-white">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg text-white">
                                {isViewMode ? <Eye size={24} className="text-white" /> : <Upload size={24} className="text-white" />}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-tight text-start">
                                    {isViewMode ? t("official_directive") : (announcement ? t("edit_announcement") : t("new_announcement"))}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-white/70 text-start">
                                    {isViewMode ? t("institutional_communication") : t("broadcast_configuration")}
                                </DialogDescription>
                            </div>
                        </div>

                        {announcement && (isSuperAdmin || isOwner) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditMode(!isEditMode)}
                                className="bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-white/10 h-8 sm:h-9"
                            >
                                {isEditMode ? <Eye size={14} className="ltr:mr-2 rtl:ml-2" /> : <PencilLine size={14} className="ltr:mr-2 rtl:ml-2" />}
                                {isEditMode ? t("view_mode") : t("edit_mode")}
                            </Button>
                        )}
                    </div>
                </div>

                {isViewMode ? (
                    /* ── View Mode Layout ── */
                    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 text-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4 text-start">
                            <div className="flex flex-wrap gap-2 text-start">
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 px-2.5 py-1">
                                    {announcement.targetType === "global" ? (isSuperAdmin ? t("global_broadcast") : t("all_faculty_students_msg")) : (announcement.targetType === "individual" ? t("individual") : (announcement.level || t("targeted")))}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-muted-foreground/20 text-muted-foreground bg-muted/10 px-2.5 py-1">
                                    {new Date(announcement._createdAt || Date.now()).toLocaleDateString()}
                                </Badge>
                            </div>

                            <h2 className="text-2xl font-black text-foreground leading-tight uppercase text-start">
                                {announcement.title}
                            </h2>

                            <div className="p-6 rounded-[24px] bg-muted/30 border border-border/40 text-sm font-medium text-foreground/80 leading-relaxed shadow-inner whitespace-pre-wrap text-start">
                                {announcement.description || t("no_specific_instructions")}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-start">
                            <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-start">
                                <div className="flex items-center gap-2 mb-1.5 opacity-50 text-start">
                                    <User size={12} className="text-primary" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("issuing_authority")}</span>
                                </div>
                                <p className="text-[11px] font-black uppercase text-foreground text-start">
                                    {isOwner
                                        ? (studyFields.find(f => f.code === user?.studyField)?.name || user?.studyField || t("my_faculty"))
                                        : (announcement.studyField
                                            ? (studyFields.find(f => f.code === announcement.studyField)?.name || announcement.studyField)
                                            : (announcement.targetFaculties && announcement.targetFaculties.length > 0
                                                ? announcement.targetFaculties.map((f: any) => f.name).join(", ")
                                                : (announcement.targetFaculty?.name || t("university_rectorate"))))}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-start">
                                <div className="flex items-center gap-2 mb-1.5 opacity-50 text-start">
                                    <Target size={12} className="text-primary" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("target_audience")}</span>
                                </div>
                                <p className="text-[11px] font-black uppercase text-foreground text-start">
                                    {announcement.targetAudience === "faculty_admins" ? t("staff_admins") : t("student_body")}
                                </p>
                            </div>
                        </div>

                        {announcement.specialty && (
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-start">
                                <div className="flex items-center gap-2 mb-1.5 opacity-50 text-start text-primary">
                                    <Target size={12} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("specialty")}</span>
                                </div>
                                <p className="text-[11px] font-black uppercase text-foreground text-start">
                                    {announcement.specialty}
                                </p>
                            </div>
                        )}

                        {announcement.targetType === "individual" && announcement.targetStudents && (
                            <div className="space-y-3 text-start">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ltr:ml-1 rtl:mr-1">
                                    <Users size={12} />
                                    {t("targeted_students")}
                                </div>
                                <div className="flex flex-wrap gap-2 text-start">
                                    {announcement.targetStudents.map((s: any) => (
                                        <Badge key={s._id} variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-muted/20 border-border/40">
                                            {s.firstName} {s.lastName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {announcement.attachments && announcement.attachments.length > 0 && (
                            <div className="space-y-4 text-start">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ltr:ml-1 rtl:mr-1">
                                    <FileText size={12} />
                                    {t("document_package")}
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-start">
                                    {announcement.attachments.map((file: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-[20px] group hover:bg-primary/5 transition-all text-start">
                                            <div className="flex items-center gap-4 text-start">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform text-primary">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="text-start">
                                                    <p className="text-[11px] font-black text-foreground truncate max-w-[250px] text-start">
                                                        {file.originalFilename || `${t("document")} ${idx + 1}`}
                                                    </p>
                                                    <p className="text-[8px] font-bold uppercase text-muted-foreground/60 tracking-widest text-start">
                                                        {t("official_artifact")} • PDF/IMG
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl"
                                                onClick={() => window.open(file.url, '_blank')}
                                            >
                                                <Download size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-0">
                            <Button
                                onClick={() => onOpenChange(false)}
                                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                            >
                                {t("mark_as_read_close")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ── Form Mode Layout ── */
                    <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 text-start animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-5">
                            {/* Basic Info */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("title")}</Label>
                                <Input
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all px-6 font-bold text-start"
                                    placeholder={t("title_placeholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("description")}</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="min-h-[120px] bg-muted/30 border-none rounded-2xl focus:bg-background transition-all p-6 font-medium text-sm resize-none text-start"
                                    placeholder={t("description_placeholder")}
                                />
                            </div>

                            {/* Configuration Grid */}
                            {!isSuperAdmin ? (
                                <div className="grid grid-cols-2 gap-4 text-start">
                                    <div className="space-y-2 text-start">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("target_type")}</Label>
                                        <Select
                                            value={formData.targetType}
                                            onValueChange={(v) => setFormData({ ...formData, targetType: v })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-bold text-start">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-card">
                                                <SelectItem value="global" className="font-bold">{t("all_faculty_students")}</SelectItem>
                                                <SelectItem value="cohort" className="font-bold">{t("cohort")}</SelectItem>
                                                <SelectItem value="individual" className="font-bold">{t("individual")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 text-start">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("target_audience")}</Label>
                                        <Select
                                            value={formData.targetAudience}
                                            onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}
                                            disabled={formData.targetType === "individual"}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-card">
                                                <SelectItem value="students" className="font-bold">{t("students")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-0.5">{t("target_audience")}</p>
                                            <p className="text-sm font-black uppercase text-foreground">{t("faculty_admins")}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 px-2.5 py-1">
                                        {t("broadcast_faculties")}
                                    </Badge>
                                </div>
                            )}

                            {/* Study Field Selection (Only for Super Admin) */}
                            {isSuperAdmin && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("target_faculties")}</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFormData({
                                                ...formData,
                                                targetFacultyIds: formData.targetFacultyIds.length === studyFields.length ? [] : studyFields.map(f => f._id)
                                            })}
                                            className="h-6 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                                        >
                                            {formData.targetFacultyIds.length === studyFields.length ? t("deselect_all") : t("select_all")}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 transition-all">
                                        {studyFields.map((f) => (
                                            <div
                                                key={f._id}
                                                onClick={() => toggleFaculty(f._id)}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group border",
                                                    formData.targetFacultyIds.includes(f._id)
                                                        ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                                                        : "bg-muted/20 border-transparent hover:bg-muted/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-5 w-5 rounded-lg flex items-center justify-center transition-all",
                                                        formData.targetFacultyIds.includes(f._id) ? "bg-primary text-white" : "bg-muted-foreground/10"
                                                    )}>
                                                        {formData.targetFacultyIds.includes(f._id) && <Check size={12} strokeWidth={4} />}
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{f.name}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] font-black bg-background border-border/40 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {f.code}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] font-black uppercase text-center text-primary/60 tracking-[0.2em] pt-1">
                                        {formData.targetFacultyIds.length} {t("faculties_selected")}
                                    </p>
                                </div>
                            )}

                            {/* Conditional Targeted Fields (Cohort) */}
                            {formData.targetType === "cohort" && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2 text-start">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("level")}</Label>
                                        <Select
                                            value={formData.level}
                                            onValueChange={(v) => setFormData({ ...formData, level: v })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-bold">
                                                <SelectValue placeholder={t("all_levels")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-card">
                                                {["L1", "L2", "L3", "M1", "M2"].map(l => (
                                                    <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("specialty")}</Label>
                                        <Select
                                            value={formData.specialty}
                                            onValueChange={(v) => setFormData({ ...formData, specialty: v })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-bold">
                                                <SelectValue placeholder={t("all_specialties")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-card">
                                                <SelectItem value="all_specialties" className="font-bold opacity-50">{t("all_specialties")}</SelectItem>
                                                {availableSpecialties.map((s: any) => {
                                                    const specName = typeof s === 'string' ? s : (s?.name || "");
                                                    if (!specName) return null;
                                                    return (
                                                        <SelectItem key={specName} value={specName} className="font-bold">{specName}</SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Conditional Individual Targeting (Student Multi-select) */}
                            {formData.targetType === "individual" && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-400">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("select_students")}</Label>
                                    <div className="rounded-[24px] border border-border/50 bg-background/50 overflow-hidden shadow-inner">
                                        <div className="p-3 border-b border-border/40 bg-muted/20 flex items-center gap-3">
                                            <Search size={14} className="text-muted-foreground" />
                                            <Input
                                                placeholder={t("search_students_placeholder")}
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                className="h-8 border-none bg-transparent focus-visible:ring-0 text-xs font-bold px-0 text-start"
                                            />
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto p-2 scrollbar-none space-y-1">
                                            {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                                <div
                                                    key={s._id}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group",
                                                        formData.targetStudentIds.includes(s._id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                                    )}
                                                    onClick={() => toggleStudent(s._id)}
                                                >
                                                    <div className="flex flex-col text-start">
                                                        <span className="text-xs font-black uppercase text-start">{s.firstName} {s.lastName}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground opacity-70 text-start">{s.studentId} • {s.specialty || s.studyField}</span>
                                                    </div>
                                                    {formData.targetStudentIds.includes(s._id) && (
                                                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white scale-110 animate-in zoom-in-50 text-white">
                                                            <Check size={12} strokeWidth={4} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            )) : (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-start">{t("no_students_found")}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t border-border/40 bg-muted/10">
                                            <p className="text-[9px] font-black uppercase text-center text-primary tracking-widest">
                                                {formData.targetStudentIds.length} {t("targeted_students")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* File Uploads */}
                            <div className="space-y-4 pt-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("attachments_label")}</Label>
                                <div className="grid grid-cols-1 gap-2 text-start">
                                    {existingAttachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-2xl group text-start">
                                            <div className="flex items-center gap-3 text-start">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-primary">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="text-[11px] font-bold truncate max-w-[200px] text-start">{file.originalFilename || t("existing_file")}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setExistingAttachments(existingAttachments.filter((_, i) => i !== idx))}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    ))}

                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl group animate-in slide-in-from-left-2 text-start">
                                            <div className="flex items-center gap-3 text-start">
                                                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                                                    <Upload size={16} />
                                                </div>
                                                <div className="text-start">
                                                    <p className="text-[11px] font-bold truncate max-w-[200px] text-start">{file.name}</p>
                                                    <p className="text-[9px] text-muted-foreground text-start">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    ))}

                                    <label className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/20 rounded-[24px] cursor-pointer hover:border-indigo-400 hover:bg-indigo-500/5 transition-all group text-start">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-start">
                                            <div className="h-9 w-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
                                                <Upload size={18} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-start">{t("click_to_upload")}</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                                                }
                                            }}
                                            accept=".pdf,image/*"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-6 border-t border-border/40 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-[11px] text-muted-foreground hover:bg-muted"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-14 rounded-2xl px-12 font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl shadow-indigo-500/20 bg-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex-1"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : (announcement ? t("update_announcement") : t("publish_announcement"))}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
