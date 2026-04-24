"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AssignmentDialog } from "@/components/prof/assignment-dialog";
import { SubmissionsReviewDialog } from "@/components/prof/submissions-review-dialog";
import { RequestMakeUpDialog } from "@/components/prof/request-makeup-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import {
    BookOpen,
    Calendar,
    MapPin,
    Clock,
    ChevronRight,
    Play,
    Loader2,
    FileText,
    Plus,
    Pencil,
    Trash2,
    Trophy,
    MessageSquare,
    AlertCircle
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function MyClassesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();
    const [professor, setProfessor] = useState<any>(null);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingSession, setIsStartingSession] = useState<string | null>(null);

    // Assignment States
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [isAssignmentsListOpen, setIsAssignmentsListOpen] = useState(false);
    const [isSubmissionReviewOpen, setIsSubmissionReviewOpen] = useState(false);
    const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
    const [classAssignments, setClassAssignments] = useState<any[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isMakeUpDialogOpen, setIsMakeUpDialogOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

    const loadData = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/prof/classes");
            if (!res.ok) {
                setIsLoading(false);
                return;
            }
            const data = await res.json();
            setProfessor(data.professor);
            setSchedules(data.schedules || []);
            setActiveSessions(data.activeSessions || []);

            // ── Fetch all assignments for this professor ────────────────
            if (data.professor?._id) {
                const assignRes = await fetch(`/api/assignments?professorId=${data.professor._id}`);
                if (assignRes.ok) {
                    const assignData = await assignRes.json();
                    setClassAssignments(assignData.assignments || []);
                }
            }
        } catch (error) {
            console.error("Error loading classes:", error);
            toast.error(t("error_occurred"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.id]);

    const handleStartSession = async (scheduleId: string) => {
        setIsStartingSession(scheduleId);
        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scheduleId, duration: 90 }), // Default 90 min
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || t("error_occurred"));
            }

            toast.success(t("session_started_success"));
            router.push("/prof"); // Redirect to dashboard to see active session
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsStartingSession(null);
        }
    };

    const isClassActive = (scheduleId: string) => {
        return activeSessions.some(session => session.schedule?._id === scheduleId);
    };

    if (!isLoading && !professor) {
        return (
            <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
                <Sidebar role="professor" />
                <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 flex items-center justify-center text-start">
                    <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-3xl border-none shadow-xl bg-card">
                        <AlertCircle className="mx-auto text-destructive" size={48} />
                        <h2 className="text-2xl font-black uppercase tracking-tight">{t("access_denied")}</h2>
                        <p className="text-muted-foreground font-medium">{t("contact_admin_error")}</p>
                        <Button onClick={() => window.location.reload()} className="rounded-xl px-8 h-12 font-bold uppercase tracking-widest text-xs">{t("retry_sync")}</Button>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
            <Sidebar role="professor" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter text-start">
                    <div className="flex items-center gap-3 mb-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary text-start">
                            <BookOpen size={12} />
                            {t("academic_curriculum")}
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                        {t("my_academic_classes")}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium text-start">
                        {t("manage_courses_desc")}
                    </p>
                </div>

                {/* ── Grid ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-enter [animation-delay:100ms] text-start">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="rounded-3xl border-none shadow-lg bg-card/50 overflow-hidden text-start">
                                <CardHeader className="space-y-2 text-start">
                                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                                    <Skeleton className="h-4 w-1/2 rounded-lg" />
                                </CardHeader>
                                <CardContent className="space-y-4 text-start">
                                    <Skeleton className="h-10 w-full rounded-xl" />
                                    <Skeleton className="h-10 w-full rounded-xl" />
                                </CardContent>
                            </Card>
                        ))
                    ) : schedules.length === 0 ? (
                        <div className="col-span-full py-20 text-center space-y-4 bg-muted/20 border-2 border-dashed border-border/50 rounded-3xl text-start">
                            <Calendar size={48} className="mx-auto text-muted-foreground/30" />
                            <h3 className="text-xl font-bold text-muted-foreground text-start">{t("no_classes_assigned")}</h3>
                            <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto font-medium text-start">{t("no_classes_desc")}</p>
                        </div>
                    ) : (
                        schedules.map((schedule) => {
                            const active = isClassActive(schedule._id);
                            const startTime = schedule.startTime || "00:00";
                            const endTime = schedule.endTime || "00:00";

                            return (
                                <Card
                                    key={schedule._id}
                                    className={`group rounded-3xl border-none shadow-xl transition-all duration-300 hover:scale-[1.02] ${active ? 'ring-2 ring-primary bg-primary/5' : 'bg-card hover:shadow-primary/5'} text-start`}
                                >
                                    <CardHeader className="relative pb-4 text-start">
                                        <div className="flex justify-between items-start mb-2 text-start">
                                            <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase border-primary/20 text-primary bg-primary/5 flex items-center gap-1.5 text-start">
                                                {schedule.subject?.code || "SUBJ"}
                                                <span className="h-1 w-1 rounded-full bg-primary/40" />
                                                <span className="opacity-70">{t(`format_${(schedule.subject?.type || "lecture").toLowerCase()}`)}</span>
                                            </Badge>
                                            {active && (
                                                <Badge className="bg-primary hover:bg-primary shadow-lg shadow-primary/20 animate-pulse rounded-lg px-2 py-0.5 text-[10px] font-black uppercase text-start">
                                                    {t("live_now")}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-xl font-black leading-tight text-foreground group-hover:text-primary transition-colors text-start">
                                            {schedule.subject?.name || t("untitled_course")}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] mt-1 text-start">
                                            <MapPin size={10} className="text-primary" />
                                            {typeof schedule.room === 'string' ? schedule.room : (schedule.room?.name || schedule.room || t("room_tbd"))}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-4 border-t border-border/50 pt-6 text-start">
                                        <div className="grid grid-cols-2 gap-3 text-start">
                                            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 text-start">
                                                <div className="flex items-center gap-2 mb-1 text-start">
                                                    <Calendar size={12} className="text-primary/70" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("schedule_label")}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground text-start">{t((schedule.day || "monday").toLowerCase())}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 text-start">
                                                <div className="flex items-center gap-2 mb-1 text-start">
                                                    <Clock size={12} className="text-primary/70" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("interval_label")}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground ltr:font-mono text-start">{startTime} - {endTime}</p>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="pt-2 pb-6 text-start">
                                        {active ? (
                                            <Button
                                                onClick={() => router.push("/prof")}
                                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20 text-start"
                                            >
                                                {t("go_to_live_session")} <ChevronRight size={14} />
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col gap-2 w-full text-start">
                                                <Button
                                                    onClick={() => handleStartSession(schedule._id)}
                                                    disabled={isStartingSession !== null || process.env.NEXT_PUBLIC_IS_LOCAL_SERVER !== "true"}
                                                    variant="outline"
                                                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 text-start"
                                                >
                                                    {isStartingSession === schedule._id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Play size={14} fill="currentColor" />
                                                    )}
                                                    {t("start_session")}
                                                </Button>
                                                {process.env.NEXT_PUBLIC_IS_LOCAL_SERVER !== "true" && (
                                                    <p className="text-[9px] text-destructive/70 font-bold uppercase text-center mt-1">
                                                        {t("local_server_only_notice") || "Available only on local server"}
                                                    </p>
                                                )}
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setActiveSubjectId(schedule.subject?._id);
                                                        setIsAssignmentsListOpen(true);
                                                    }}
                                                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 bg-muted/50 hover:bg-muted text-muted-foreground transition-all text-start"
                                                >
                                                    <FileText size={14} />
                                                    {t("manage_assignments")} ({classAssignments.filter((a: any) => a.subject?._id === schedule.subject?._id).length})
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedSchedule(schedule);
                                                        setIsMakeUpDialogOpen(true);
                                                    }}
                                                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all text-start"
                                                >
                                                    <Calendar size={14} />
                                                    {t("request_makeup")}
                                                </Button>
                                            </div>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* ── Assignments List Dialog ────────────────────── */}
                <Dialog open={isAssignmentsListOpen} onOpenChange={setIsAssignmentsListOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto border-none shadow-2xl rounded-3xl p-0 bg-card flex flex-col scrollbar-none text-start">
                        <DialogHeader className="p-8 pb-0 text-start">
                            <div className="flex items-center justify-between mb-2 text-start">
                                <div className="space-y-1 text-start">
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-start">{t("active_assignments")}</DialogTitle>
                                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-primary/50 underline-offset-4 decoration-2 text-start">
                                        {schedules.find(s => s.subject?._id === activeSubjectId)?.subject?.name || t("module_assignments")}
                                    </DialogDescription>
                                </div>
                                <Button
                                    onClick={() => {
                                        setSelectedAssignment(null);
                                        setIsAssignmentDialogOpen(true);
                                    }}
                                    className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20 text-start"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    {t("assign_task")}
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 px-8 py-6 space-y-4 text-start">
                            {classAssignments.filter((a: any) => a.subject?._id === activeSubjectId).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center opacity-40 text-start">
                                    <FileText size={48} className="mb-4 text-muted-foreground" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-start">{t("no_records_found")}</p>
                                </div>
                            ) : (
                                <div className="space-y-4 text-start">
                                    {classAssignments.filter((a: any) => a.subject?._id === activeSubjectId).map((assignment) => (
                                        <Card key={assignment._id} className="rounded-2xl border-none bg-muted/30 hover:bg-muted/50 transition-colors p-5 relative group text-start">
                                            <div className="space-y-2 text-start">
                                                <div className="flex justify-between items-start text-start">
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 bg-primary/5 text-primary text-start">
                                                        {assignment.type}
                                                    </Badge>
                                                    <div className="flex gap-2 text-start">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-start"
                                                            onClick={() => {
                                                                setSelectedAssignment(assignment);
                                                                setIsAssignmentDialogOpen(true);
                                                            }}
                                                        >
                                                            <Pencil size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-start"
                                                            onClick={() => {
                                                                setSelectedAssignment(assignment);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-foreground leading-tight text-start">{assignment.title}</h3>
                                                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2 text-start">
                                                    <div className="flex items-center gap-1.5 text-start">
                                                        <Calendar size={12} className="text-primary/50" />
                                                        {new Date(assignment.dueDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-start">
                                                        <Trophy size={12} className="text-primary/50" />
                                                        {assignment.points} {t("pts")}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(assignment);
                                                            setIsSubmissionReviewOpen(true);
                                                        }}
                                                        className="flex items-center gap-1.5 text-primary hover:underline transition-all text-start"
                                                    >
                                                        <MessageSquare size={12} />
                                                        {t("review_submissions")}
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 pt-0 mt-auto text-start">
                            <Button
                                variant="ghost"
                                className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-muted/50 text-start"
                                onClick={() => setIsAssignmentsListOpen(false)}
                            >
                                {t("close_manager")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Dialogs ───────────────────────────────────────── */}
                <AssignmentDialog
                    open={isAssignmentDialogOpen}
                    onOpenChange={setIsAssignmentDialogOpen}
                    assignment={selectedAssignment}
                    professorId={professor?._id}
                    initialSubjectId={activeSubjectId}
                    onSuccess={loadData}
                />

                <SubmissionsReviewDialog
                    open={isSubmissionReviewOpen}
                    onOpenChange={setIsSubmissionReviewOpen}
                    assignment={selectedAssignment}
                />

                <RequestMakeUpDialog
                    open={isMakeUpDialogOpen}
                    onOpenChange={setIsMakeUpDialogOpen}
                    schedule={selectedSchedule}
                    professorId={professor?._id}
                />

                <DeleteDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    onConfirm={async () => {
                        if (!selectedAssignment) return;
                        setIsDeleting(true);
                        try {
                            const res = await fetch(`/api/assignments?id=${selectedAssignment._id}`, { method: "DELETE" });
                            if (res.ok) {
                                toast.success(t("assignment_purged"));
                                loadData();
                                setIsDeleteDialogOpen(false);
                            } else {
                                throw new Error("Deletion failed");
                            }
                        } catch (error: any) {
                            toast.error(error.message);
                        } finally {
                            setIsDeleting(false);
                        }
                    }}
                    title={t("purge_academic_task")}
                    description={t("delete_assignment_confirm").replace("{title}", selectedAssignment?.title || "")}
                />
            </main >
        </div >
    );
}
