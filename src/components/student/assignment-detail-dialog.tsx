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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Calendar,
    Trophy,
    BookOpen,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    ExternalLink,
    Upload,
    Loader2,
    CheckCircle,
    MessageSquare,
    Scale,
    Gavel,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface AssignmentDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignment: any;
}

export function AssignmentDetailDialog({
    open,
    onOpenChange,
    assignment
}: AssignmentDetailDialogProps) {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submission, setSubmission] = useState<any>(assignment?.submission || null);
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
    const [isAppealing, setIsAppealing] = useState(false);
    const [appealText, setAppealText] = useState("");
    const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

    useEffect(() => {
        if (open) {
            setFile(null);
            setContent("");
        }
    }, [open, assignment?._id]);

    useEffect(() => {
        async function fetchStatus() {
            if (open && assignment?._id) {
                // If we don't already have it or it's a new assignment, fetch it
                if (!assignment.submission || submission?.assignment?._ref !== assignment._id) {
                    setIsLoadingSubmission(true);
                    try {
                        const res = await fetch(`/api/assignments/status?assignmentId=${assignment._id}`);
                        if (res.ok) {
                            const data = await res.json();
                            setSubmission(data.status);
                        }
                    } catch (error) {
                        console.error("Error fetching submission status:", error);
                    } finally {
                        setIsLoadingSubmission(false);
                    }
                }
            }
        }
        fetchStatus();
    }, [open, assignment?._id, assignment?.submission]);

    if (!assignment) return null;

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file to upload");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("assignmentId", assignment._id);
        formData.append("file", file);
        formData.append("content", content);

        try {
            const res = await fetch("/api/assignments/submit", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                toast.success("Assignment uploaded successfully!");
                setFile(null);
                setContent("");
                onOpenChange(false);
            } else {
                const data = await res.json();
                throw new Error(data.message || "Upload failed");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAppeal = async () => {
        if (!appealText.trim()) {
            toast.error("Please provide a reason for your appeal");
            return;
        }

        setIsSubmittingAppeal(true);
        try {
            const res = await fetch("/api/assignments/appeal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: submission._id,
                    appealMessage: appealText
                }),
            });

            if (res.ok) {
                toast.success("Appeal submitted successfully!");
                setIsAppealing(false);
                // Refresh status
                const statusRes = await fetch(`/api/assignments/status?assignmentId=${assignment._id}`);
                const statusData = await statusRes.json();
                setSubmission(statusData.status);
            } else {
                const data = await res.json();
                throw new Error(data.message || "Appeal submission failed");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmittingAppeal(false);
        }
    };

    const getStatusInfo = (dueDate: string) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (diff < 0) return { label: t("expired"), color: "text-red-600 bg-red-500/10 border-red-500/20", icon: AlertCircle, isExpired: true };
        if (days <= 2) return { label: t("urgent"), color: "text-orange-600 bg-orange-500/10 border-orange-500/20", icon: Clock, isExpired: false };
        return { label: t("active"), color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, isExpired: false };
    };

    const status = getStatusInfo(assignment.dueDate);
    const StatusIcon = status.icon;
    const isAffichage = assignment?.type === "affichage";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 bg-card border border-border/50 scrollbar-none flex flex-col">
                <div className="px-8 pb-8 pt-8 flex-1">
                    <DialogHeader className="p-0 mb-6 relative">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest">
                                    <BookOpen size={12} />
                                    {assignment.subject?.name || t("academic_task")}
                                    {(assignment.subject?.level || assignment.subject?.degree) && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-[8px] font-black tracking-widest text-primary">
                                            {assignment.subject.level} {assignment.subject.specialty || assignment.subject.degree}
                                        </span>
                                    )}
                                </div>
                                <Badge variant="outline" className={cn("rounded-lg font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 border-primary/20", status.color)}>
                                    <StatusIcon size={10} className="mr-1" />
                                    {status.label}
                                </Badge>
                            </div>
                            {assignment.subject?.professor?.fullName && (
                                <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-primary/5 border border-primary/10 w-fit shadow-inner">
                                    <div className="h-5 w-5 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <User size={10} className="text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest font-mono">
                                        {t("prof")}: {assignment.subject.professor.fullName}
                                    </span>
                                </div>
                            )}
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none pr-8 mb-2 text-start">
                                {assignment.title}
                            </DialogTitle>
                            <DialogDescription className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] text-start">
                                {isAffichage ? t("announcement") : `${t(assignment.type)} • ${assignment.points} ${t("pts")}`}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-2 text-start">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                <FileText size={10} />
                                {t("instructions_title")}
                            </div>
                            <div className="p-5 rounded-3xl bg-muted/30 border border-border/50 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                {assignment.description || t("no_instructions")}
                            </div>
                        </div>

                        <div className={cn("grid gap-3", isAffichage ? "grid-cols-1" : "grid-cols-2")}>
                            <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex flex-col items-center text-center gap-1">
                                <Calendar size={16} className="text-primary/60 mb-1" />
                                <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">{t("deadline")}</div>
                                <div className="text-xs font-black">{new Date(assignment.dueDate).toLocaleDateString()}</div>
                            </div>
                            {!isAffichage && (
                                <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex flex-col items-center text-center gap-1">
                                    <Trophy size={16} className="text-primary/60 mb-1" />
                                    <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">{t("score_label")}</div>
                                    <div className="text-xs font-black">{assignment.points} {t("pts")}</div>
                                </div>
                            )}
                        </div>

                        {/* Professor Attachments */}
                        {assignment.attachments && assignment.attachments.length > 0 && (
                            <div className="space-y-2 text-start">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                    <FileText size={10} />
                                    {t("professor_files")}
                                </div>
                                <div className="space-y-2">
                                    {assignment.attachments.map((att: any, idx: number) => (
                                        <a
                                            key={att._key || idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                                    {att.originalFilename || t("attachment_num").replace("{num}", String(idx + 1))}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">{t("click_to_open")}</p>
                                            </div>
                                            <ExternalLink size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Grading & Feedback Section */}
                        {submission && submission.status === "graded" && !isAffichage && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 text-start">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                    <CheckCircle2 size={12} className="text-green-500" />
                                    {t("evaluation_results")}
                                </div>
                                <div className="p-6 rounded-[32px] bg-green-500/5 border border-green-500/10 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                                                <Trophy size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-green-600/60 uppercase tracking-widest text-start">{t("your_grade")}</p>
                                                <p className="text-xl font-black text-green-600 text-start">
                                                    {submission.grade} <span className="text-xs text-green-600/40 font-bold uppercase tracking-widest ltr:ml-1 rtl:mr-1">/ {assignment.points}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-3">
                                            {t("validated")}
                                        </Badge>
                                    </div>

                                    {submission.feedback && (
                                        <div className="space-y-2 border-t border-green-500/10 pt-4 text-start">
                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-green-600/60 text-start">
                                                <MessageSquare size={10} />
                                                {t("professor_feedback_label")}
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/50 border border-green-500/5 text-xs font-medium text-foreground/80 leading-relaxed text-start">
                                                "{submission.feedback}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Appeal Logic */}
                                    <div className="pt-4 border-t border-green-500/10">
                                        {!submission.appealStatus && !isAppealing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsAppealing(true)}
                                                className="w-full justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-green-700 hover:bg-green-500/10 h-8 rounded-xl"
                                            >
                                                <Scale size={12} />
                                                {t("appeal_this_grade")}
                                            </Button>
                                        )}

                                        {isAppealing && (
                                            <div className="space-y-3 animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-green-700">
                                                    <Gavel size={10} />
                                                    {t("submit_your_appeal")}
                                                </div>
                                                <Textarea
                                                    placeholder={t("appeal_reason_placeholder")}
                                                    value={appealText}
                                                    onChange={(e) => setAppealText(e.target.value)}
                                                    className="min-h-[100px] bg-white/60 border-green-500/10 rounded-2xl p-3 text-[10px] font-medium resize-none shadow-inner focus:border-green-500/30 transition-all text-start"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setIsAppealing(false)}
                                                        className="flex-1 text-[8px] font-bold uppercase tracking-widest h-9 rounded-xl"
                                                    >
                                                        {t("cancel_btn")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAppeal}
                                                        disabled={isSubmittingAppeal}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[8px] font-black uppercase tracking-widest h-9 rounded-xl shadow-lg shadow-green-600/10"
                                                    >
                                                        {isSubmittingAppeal ? <Loader2 size={12} className="animate-spin" /> : t("confirm_appeal")}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {submission.appealStatus && (
                                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 text-start">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-primary">
                                                        <Gavel size={10} />
                                                        {t("appeal_status_label")}
                                                    </div>
                                                    <Badge className={cn(
                                                        "text-[7px] font-black uppercase tracking-widest px-2",
                                                        submission.appealStatus === 'pending' ? "bg-amber-500" :
                                                            submission.appealStatus === 'reviewed' ? "bg-blue-500" :
                                                                submission.appealStatus === 'accepted' ? "bg-green-500" : "bg-red-500"
                                                    )}>
                                                        {t(submission.appealStatus)}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed text-start">
                                                    "{submission.appealMessage}"
                                                </p>
                                                <p className="text-[7px] font-black text-muted-foreground/30 uppercase text-right">
                                                    {t("submitted_on").replace("{date}", new Date(submission.appealDate).toLocaleDateString())}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoadingSubmission ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-primary/40" />
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t("checking_status")}</p>
                            </div>
                        ) : (
                            <>
                                {/* Submission Receipt Section */}
                                {submission && !isAffichage && (
                                    <div className="space-y-4 pt-6 border-t border-border/40 animate-in fade-in zoom-in-95 duration-500 text-start">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                            <CheckCircle size={10} />
                                            {t("submission_received")}
                                        </div>
                                        <div className="p-5 rounded-3xl bg-muted/20 border border-border/40 space-y-4 shadow-inner">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest text-start">{t("attached_file")}</p>
                                                        <a
                                                            href={submission.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-black truncate block hover:text-primary transition-colors flex items-center gap-1 group/link"
                                                        >
                                                            {t("view_submission")}
                                                            <ExternalLink size={10} className="transition-transform group-hover/link:translate-x-0.5 ltr:ml-1 rtl:mr-1" />
                                                        </a>
                                                    </div>
                                                </div>
                                                <p className="text-[8px] font-bold text-muted-foreground/40">
                                                    {submission.submissionDate ? new Date(submission.submissionDate).toLocaleDateString() : t("date_n_a")}
                                                </p>
                                            </div>
                                            {submission.content && (
                                                <div className="space-y-1 bg-background/50 p-3 rounded-2xl border border-border/20">
                                                    <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 text-start">{t("your_notes")}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground line-clamp-3 text-start">
                                                        "{submission.content}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!submission && assignment.type !== "affichage" && !status.isExpired && (
                                    <div className="border-t border-border/40 pt-6 space-y-4 text-start">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                            <Upload size={10} />
                                            {t("submit_your_solution")}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="relative group">
                                                <Input
                                                    type="file"
                                                    id="solution-upload"
                                                    className="hidden"
                                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                />
                                                <label
                                                    htmlFor="solution-upload"
                                                    className={cn(
                                                        "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
                                                        file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center justify-center py-4">
                                                        {file ? (
                                                            <>
                                                                <CheckCircle size={20} className="text-primary mb-1" />
                                                                <p className="px-4 text-[10px] font-bold text-center truncate w-64">{file.name}</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload size={20} className="text-muted-foreground/40 mb-1 group-hover:text-primary transition-colors" />
                                                                <p className="text-[9px] font-black uppercase tracking-tight text-muted-foreground/60 group-hover:text-primary transition-colors">{t("select_file")}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </label>
                                            </div>
                                            <Textarea
                                                placeholder={t("solution_notes_placeholder")}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                className="min-h-[80px] bg-muted/20 border-none rounded-2xl focus:bg-background transition-all p-3 text-[11px] font-medium resize-none shadow-inner text-start"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!submission && assignment.type === "affichage" && (
                                    <div className="border-t border-border/40 pt-6">
                                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3 text-primary">
                                            <AlertCircle size={16} />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-start">{t("informational_post_desc")}</p>
                                        </div>
                                    </div>
                                )}

                                {!submission && status.isExpired && (
                                    <div className="border-t border-border/40 pt-6">
                                        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10 flex items-center gap-4 text-red-600 text-start">
                                            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">{t("submission_deadline_expired")}</p>
                                                <p className="text-[11px] font-medium opacity-70">{t("cannot_submit_expired")}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter className="sticky bottom-0 p-6 bg-card/90 backdrop-blur-md border-t border-border/40 flex sm:justify-between items-center gap-3">
                    <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest hidden sm:block">
                        ID: {assignment._id?.slice(-6).toUpperCase()}
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[9px] text-muted-foreground hover:bg-muted"
                        >
                            {t("close_btn")}
                        </Button>
                        {!submission && assignment.type !== "affichage" && !status.isExpired && (
                            <Button
                                onClick={handleUpload}
                                disabled={isSubmitting || !file}
                                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <>
                                        {t("confirm_upload")}
                                        <ExternalLink size={12} />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
