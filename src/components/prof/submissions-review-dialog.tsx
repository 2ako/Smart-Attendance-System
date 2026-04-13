"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    FileText,
    Download,
    CheckCircle2,
    Clock,
    User,
    Trophy,
    MessageSquare,
    Loader2,
    ExternalLink,
    Search,
    ChevronRight,
    GraduationCap,
    Gavel,
    Scale,
    XCircle,
    CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface SubmissionsReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignment: any;
}

export function SubmissionsReviewDialog({
    open,
    onOpenChange,
    assignment
}: SubmissionsReviewDialogProps) {
    const { t } = useTranslation();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [grade, setGrade] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchSubmissions = async () => {
        if (!assignment?._id) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/prof/submissions?assignmentId=${assignment._id}`);
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data.submissions || []);
            }
        } catch (error) {
            console.error("Error loading submissions:", error);
            toast.error(t("failed_load_submissions"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && assignment?._id) {
            fetchSubmissions();
            setSelectedSubmission(null);
            setGrade("");
            setFeedback("");
        }
    }, [open, assignment?._id]);

    const handleSelectSubmission = (sub: any) => {
        setSelectedSubmission(sub);
        setGrade(sub.grade?.toString() || "");
        setFeedback(sub.feedback || "");
    };

    const handleSaveGrade = async (appealStatus?: string) => {
        if (!selectedSubmission) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/prof/submissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: selectedSubmission._id,
                    grade: Number(grade),
                    feedback,
                    status: "graded",
                    appealStatus: appealStatus || selectedSubmission.appealStatus
                }),
            });

            if (res.ok) {
                toast.success(appealStatus ? t("appeal_processed_success") : t("grade_submitted_success"));
                fetchSubmissions();
                // Update local selected state
                setSelectedSubmission({
                    ...selectedSubmission,
                    grade: Number(grade),
                    feedback,
                    status: "graded",
                    appealStatus: appealStatus || selectedSubmission.appealStatus
                });
            } else {
                throw new Error(t("failed_save_grade"));
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredSubmissions = submissions.filter(sub =>
        sub.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.student?.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!assignment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden border-none shadow-2xl rounded-[40px] p-0 bg-card flex flex-col text-start">
                <div className="flex flex-1 overflow-hidden text-start">
                    {/* ── Left Sidebar: List ──────────────────────────── */}
                    <div className="w-[380px] border-r border-border/40 flex flex-col bg-muted/5 text-start">
                        <DialogHeader className="p-8 pb-4">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-start">
                                    <GraduationCap className="text-primary" size={20} />
                                    {t("submissions")}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground line-clamp-1 text-start">
                                    {assignment.title}
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        <div className="px-6 mb-4">
                            <div className="relative group">
                                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 h-3.5 w-3.5 group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder={t("search_students_placeholder")}
                                    className="ltr:pl-9 rtl:pr-9 h-10 border-none bg-muted/20 rounded-xl text-[11px] font-medium focus-visible:ring-primary/20 text-start"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 scrollbar-none">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-16 w-full rounded-2xl bg-muted/20 animate-pulse" />
                                ))
                            ) : filteredSubmissions.length === 0 ? (
                                <div className="py-12 text-center opacity-30 text-[11px] font-bold uppercase tracking-widest">
                                    {t("no_submissions_found")}
                                </div>
                            ) : (
                                filteredSubmissions.map((sub) => (
                                    <button
                                        key={sub._id}
                                        onClick={() => handleSelectSubmission(sub)}
                                        className={cn(
                                            "w-full ltr:text-left rtl:text-right p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden",
                                            selectedSubmission?._id === sub._id
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "hover:bg-muted/50 text-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm",
                                            selectedSubmission?._id === sub._id ? "bg-white/20" : "bg-primary/5 text-primary"
                                        )}>
                                            {sub.student?.user?.name?.[0] || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0 text-start">
                                            <p className="font-black text-[11px] uppercase tracking-tight truncate text-start">
                                                {sub.student?.user?.name || t("unknown_student")}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge className={cn(
                                                    "h-4 px-1 text-[7px] font-black uppercase tracking-tighter rounded-sm",
                                                    sub.status === "graded"
                                                        ? (selectedSubmission?._id === sub._id ? "bg-white/20 text-white" : "bg-green-500/10 text-green-600")
                                                        : (selectedSubmission?._id === sub._id ? "bg-white/10 text-white/70" : "bg-amber-500/10 text-amber-600")
                                                )}>
                                                    {sub.status === "graded" ? t("graded") : t("pending")}
                                                </Badge>
                                                {sub.grade !== undefined && (
                                                    <span className="text-[9px] font-black opacity-60">
                                                        {sub.grade}/{assignment.points}
                                                    </span>
                                                )}
                                                {sub.appealStatus === 'pending' && (
                                                    <Badge className="bg-primary animate-pulse text-[7px] font-black uppercase tracking-tighter rounded-sm">
                                                        {t("appeal")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className={cn(
                                            "opacity-0 group-hover:opacity-100 transition-opacity",
                                            selectedSubmission?._id === sub._id ? "text-white" : "text-primary/40"
                                        )} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Right Content: Review ────────────────────────── */}
                    <div className="flex-1 flex flex-col bg-card text-start">
                        {selectedSubmission ? (
                            <div className="flex-1 flex flex-col overflow-hidden text-start">
                                <div className="p-8 border-b border-border/40 flex items-center justify-between bg-muted/5 text-start">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                            <User size={24} />
                                        </div>
                                        <div className="text-start">
                                            <h3 className="text-xl font-black uppercase tracking-tight text-start">{selectedSubmission.student?.user?.name}</h3>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-start">
                                                <Badge variant="outline" className="h-4 p-0 px-2 font-mono text-[8px] border-primary/20 text-primary">
                                                    {selectedSubmission.student?.matricule || t("no_ref")}
                                                </Badge>
                                                <span className="opacity-40">•</span>
                                                {t("submitted")} {new Date(selectedSubmission.submissionDate).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-primary/20 hover:bg-primary/5 text-primary shadow-sm"
                                        onClick={() => window.open(selectedSubmission.fileUrl, '_blank')}
                                    >
                                        <Download size={16} />
                                        {t("download_work")}
                                        <ExternalLink size={14} className="opacity-50" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
                                    {/* Student Notes */}
                                    {selectedSubmission.content && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                                <MessageSquare size={12} className="text-primary/40" />
                                                {t("student_remarks")}
                                            </div>
                                            <div className="p-6 rounded-[28px] bg-muted/30 border border-border/40 text-sm font-medium text-foreground/80 leading-relaxed shadow-inner text-start">
                                                "{selectedSubmission.content}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Student Appeal */}
                                    {selectedSubmission.appealMessage && (
                                        <div className="space-y-3 animate-in slide-in-from-left-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                                    <Gavel size={12} />
                                                    {t("grade_appeal_registry")}
                                                </div>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-3 py-1",
                                                    selectedSubmission.appealStatus === 'pending' ? "bg-amber-500" :
                                                        selectedSubmission.appealStatus === 'reviewed' ? "bg-blue-500" :
                                                            selectedSubmission.appealStatus === 'accepted' ? "bg-green-500" : "bg-red-500"
                                                )}>
                                                    {t("appeal")}: {t(selectedSubmission.appealStatus)}
                                                </Badge>
                                            </div>
                                            <div className="p-6 rounded-[28px] bg-primary/5 border border-primary/10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <Scale size={48} />
                                                </div>
                                                <p className="text-sm font-bold text-foreground/80 leading-relaxed relative z-10">
                                                    "{selectedSubmission.appealMessage}"
                                                </p>
                                                <p className="text-[8px] font-black text-primary/40 uppercase mt-4 block">
                                                    {t("submitted_on")} {new Date(selectedSubmission.appealDate).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Grading Form */}
                                    <div className="space-y-6 max-w-2xl">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                            <Trophy size={12} />
                                            {t("grading_feedback")}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("score")}</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        max={assignment.points}
                                                        value={grade}
                                                        onChange={(e) => setGrade(e.target.value)}
                                                        className="h-14 bg-muted/20 border-none rounded-2xl focus:bg-background transition-all pl-4 pr-12 font-black text-lg text-start"
                                                    />
                                                    <span className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/40">
                                                        / {assignment.points}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("professor_feedback")}</Label>
                                                <Textarea
                                                    placeholder={t("feedback_placeholder")}
                                                    value={feedback}
                                                    onChange={(e) => setFeedback(e.target.value)}
                                                    className="min-h-[120px] bg-muted/20 border-none rounded-2xl focus:bg-background transition-all p-4 text-xs font-medium resize-none shadow-sm text-start"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            {selectedSubmission.appealStatus === 'pending' && (
                                                <div className="flex gap-2 mr-auto">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleSaveGrade('rejected')}
                                                        disabled={isSaving}
                                                        className="h-14 px-6 rounded-2xl border-red-500/20 text-red-600 hover:bg-red-500/5 font-black uppercase tracking-widest text-[10px] gap-2"
                                                    >
                                                        <XCircle size={16} />
                                                        {t("reject_appeal")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleSaveGrade('accepted')}
                                                        disabled={isSaving}
                                                        className="h-14 px-6 rounded-2xl border-green-500/20 text-green-600 hover:bg-green-500/5 font-black uppercase tracking-widest text-[10px] gap-2"
                                                    >
                                                        <CheckCircle size={16} />
                                                        {t("accept_update")}
                                                    </Button>
                                                </div>
                                            )}
                                            <Button
                                                onClick={() => handleSaveGrade()}
                                                disabled={isSaving || !grade}
                                                className="h-14 ltr:px-10 rtl:px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                {t("confirm_publish_grade")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-30">
                                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                                    <FileText size={48} className="text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-tight">{t("select_submission")}</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest">{t("pick_student_sidebar")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
