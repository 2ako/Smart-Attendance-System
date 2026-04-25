"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CountdownTimer } from "@/components/prof/countdown-timer";
import {
    Users,
    Plus,
    Trash2,
    FileSpreadsheet,
    FileText,
    Clock,
    Radio,
    Square,
    AlertCircle,
    Fingerprint,
} from "lucide-react";
import { Skeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

// Types
interface AttendanceRecord {
    _id: string;
    timestamp: string;
    status: "present" | "late";
    student?: {
        _id: string;
        matricule?: string;
        firstName?: string;
        lastName?: string;
        studyField?: string;
        specialty?: string;
        degree?: string;
        level?: string;
        group?: string;
        user?: {
            name?: string;
        };
    };
}

import { sanityClient } from "@/lib/sanity/client";
import { getProfessorByUserId, getActiveSessionsByProfessor } from "@/lib/sanity/queries";

import { useTranslation } from "@/lib/i18n/context";

export default function ProfessorDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [professor, setProfessor] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Initial Profile & Session & Attendance Fetch
    useEffect(() => {
        async function loadInitialData() {
            if (!user?.id) return;
            try {
                // Fetch Profile and Active Session
                const res = await fetch("/api/prof/profile");
                if (res.ok) {
                    const data = await res.json();
                    setProfessor(data.professor);
                    
                    if (data.activeSession) {
                        setSession(data.activeSession);
                        
                        // Fetch initial attendance for the active session
                        const attRes = await fetch(`/api/attendance?sessionId=${data.activeSession._id}`);
                        if (attRes.ok) {
                            const attData = await attRes.json();
                            setAttendance(attData.attendance || []);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading initial dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadInitialData();
    }, [user?.id]);

    const sessionId = session?._id || null;
    const professorId = professor?._id || null;
    const isSessionActive = session?.status === "open";

    // ── Real-time Updates via Sanity Listeners ────────────────────────
    useRealtime({
        enabled: !!user?.id,
        sessionId,
        professorId,
        onEvent: (event) => {
            console.log("Real-time event received:", event);

            switch (event.type) {
                case "attendance_update":
                    if (event.sessionId === sessionId) {
                        setAttendance((prev) => {
                            const exists = prev.some((r) => r._id === event.record._id);
                            if (exists) return prev.map((r) => (r._id === event.record._id ? event.record : r));
                            return [event.record, ...prev];
                        });
                    }
                    break;

                case "attendance_delete":
                    if (event.sessionId === sessionId) {
                        setAttendance((prev) => prev.filter((r) => r._id !== event.id));
                    }
                    break;

                case "session_update":
                    // If it's the current session or we don't have one, update it
                    if (!sessionId || event.session._id === sessionId) {
                        setSession(event.session.status === "open" ? event.session : null);
                        // Clear attendance if session closed
                        if (event.session.status !== "open") {
                            setAttendance([]);
                        }
                    } else if (event.session.status === "open") {
                        // A new session started (maybe via ESP32)
                        setSession(event.session);
                    }
                    break;
            }
        },
    });

    const handleCloseSession = async () => {
        if (!sessionId) return;
        try {
            const res = await fetch("/api/sessions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, action: "close" }),
            });
            if (res.ok) {
                setSession((prev: any) => ({ ...prev, status: "closed" }));
            }
        } catch (err) {
            console.error("Failed to close session:", err);
        }
    };

    const handleExtend = async (minutes: number) => {
        if (!sessionId) return;
        try {
            const res = await fetch("/api/sessions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, action: "extend", duration: minutes }),
            });
            if (res.ok) {
                setSession((prev: any) => ({
                    ...prev,
                    endTime: new Date(new Date(prev.endTime).getTime() + minutes * 60 * 1000).toISOString(),
                }));
            }
        } catch (err) {
            console.error("Failed to extend session:", err);
        }
    };

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    const fetchAllStudents = useCallback(async () => {
        try {
            const res = await fetch("/api/students");
            if (res.ok) {
                const data = await res.json();
                setAllStudents(data.students || []);
            }
        } catch (err) {
            console.error("Failed to fetch students:", err);
        }
    }, []);

    useEffect(() => {
        if (session?.status === "open") {
            fetchAllStudents();
        }
    }, [session?.status, fetchAllStudents]);

    const handleAddAttendance = async () => {
        if (!sessionId || !selectedStudentId) return;
        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, studentId: selectedStudentId }),
            });
            if (res.ok) {
                setSelectedStudentId("");
                // Real-time SSE will update the list automatically
            }
        } catch (err) {
            console.error("Failed to add attendance:", err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/attendance?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                // Real-time SSE will update the list automatically
            }
        } catch (err) {
            console.error("Failed to delete attendance:", err);
        }
    };

    const [timeLeft, setTimeLeft] = useState<string>("");

    // ── Timer Logic ──────────────────────────────────────────
    useEffect(() => {
        if (!session?.endTime || session.status !== "open") {
            setTimeLeft("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(session.endTime).getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft("EXPIRED");
                clearInterval(interval);
                // Refresh session to reflect closed status if needed
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [session?.endTime, session?.status]);

    const handleExport = (format: "excel" | "pdf") => {
        if (!sessionId) return;
        window.open(`/api/export/` + format + `?sessionId=${sessionId}`, "_blank");
    };

    const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
    const attendanceRate = session ? Math.round((presentCount / 30) * 100) : 0; // Mock target 30

    if (!isLoading && !professor) {
        return (
            <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
                <Sidebar role="professor" />
                <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 flex items-center justify-center text-start">
                    <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-2xl border-border bg-card">
                        <AlertCircle className="mx-auto text-destructive" size={48} />
                        <h2 className="text-xl font-bold">{t("profile_not_found")}</h2>
                        <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest">{t("contact_admin_error")}</p>
                        <Button onClick={() => window.location.reload()} className="rounded-xl h-12 font-black uppercase tracking-widest text-[10px] w-full">{t("retry_sync")}</Button>
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
                    <div className="flex items-center gap-4 mb-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <Radio size={12} className={session?.status === "open" ? "animate-pulse" : ""} />
                            {!session ? t("no_active_session") : session.status === "open" ? t("session_active") : t("session_closed")}
                        </div>
                        {(session?.schedule?.subject || session?.subject) && (
                            <div className="flex items-center gap-2 text-start">
                                <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-black uppercase border-none bg-primary/10 text-primary">
                                    {(session?.schedule?.subject?.degree || session?.subject?.degree)}
                                </Badge>
                                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-black uppercase border-primary/20 text-primary">
                                    {(session?.schedule?.subject?.level || session?.subject?.level)}
                                </Badge>
                                <Badge variant="default" className="px-2 py-0.5 text-[10px] font-black uppercase shadow-sm">
                                    {t(`format_${((session?.schedule?.subject?.type || session?.subject?.type) || "lecture").toLowerCase()}`)}
                                </Badge>
                                {session?.isMakeUp && (
                                    <Badge className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-none">
                                        {t("makeup_class")}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-start">
                        {session?.schedule?.subject?.name || session?.subject?.name || t("ready_to_start")}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-start">
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs text-start">
                            {(session?.schedule?.subject?.code || session?.subject?.code) && `${session.schedule?.subject?.code || session?.subject?.code} • `}
                            {session?.schedule?.room || session?.roomName || session?.room || t("awaiting_session_start")}
                        </p>
                        {(session?.schedule?.subject?.studyField || session?.subject?.studyField) && (
                            <Badge variant="outline" className="h-5 px-2 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60 border-primary/20 bg-muted/30">
                                {session.schedule?.subject?.studyField || session?.subject?.studyField}
                            </Badge>
                        )}
                        {session?.isMakeUp && (
                            <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest text-amber-600 border-amber-500/30 bg-amber-500/10 border-dashed animate-pulse">
                                {t("makeup_class")}
                            </Badge>
                        )}
                        {session?.group && session.group !== "all" && (
                            <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/10">
                                {t("group_prefix")} {session.group}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3 text-start">
                    {isLoading ? (
                        <>
                            <div className="lg:col-span-2 text-start"><Skeleton className="h-[200px] w-full rounded-2xl" /></div>
                            <Skeleton className="h-[200px] w-full rounded-2xl" />
                        </>
                    ) : (
                        <>
                            {/* Session Status Card */}
                            <Card className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-2 overflow-hidden animate-enter [animation-delay:100ms] text-start">
                                <CardContent className="p-8 text-start">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-start">
                                        <div className="space-y-6 flex-1 w-full text-start">
                                            <div className="flex items-center gap-6 text-start">
                                                <div className="relative">
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                                                        <Clock size={32} className="text-primary" />
                                                    </div>
                                                </div>
                                                <div className="text-start">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 text-start">{t("time_remaining")}</p>
                                                    {session ? (
                                                        <CountdownTimer endTime={session.endTime} isActive={session.status === "open"} />
                                                    ) : (
                                                        <div className="text-2xl font-black text-muted-foreground/30">00:00:00</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3 text-start">
                                                {session?.status === "open" ? (
                                                    <>
                                                        <Button variant="destructive" size="sm" onClick={handleCloseSession} className="rounded-xl px-6 h-10 font-bold gap-2 uppercase text-[10px] tracking-widest">
                                                            <Square size={14} fill="currentColor" /> {t("end_session")}
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="rounded-xl px-4 h-10 border-border bg-muted/50 hover:bg-muted font-bold text-[10px] tracking-widest" onClick={() => handleExtend(10)}>+10 {t("min")}</Button>
                                                    </>
                                                ) : session?.status === "closed" ? (
                                                    <Button variant="outline" size="sm" className="rounded-xl px-6 h-10 border-green-500/30 text-green-600 bg-green-500/10 font-bold disabled:opacity-50 uppercase text-[10px] tracking-widest">
                                                        {t("session_logged")}
                                                    </Button>
                                                ) : (
                                                    <Button disabled variant="outline" size="sm" className="rounded-xl px-6 h-10 border-border bg-muted/20 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                                                        {t("visit_my_classes")}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto p-4 rounded-2xl bg-muted/50 border border-border text-start">
                                            <div className="space-y-3 text-start">
                                                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-tighter text-start">
                                                    <Clock size={14} className="text-primary" />
                                                    {t("start")}: {session ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-tighter text-start">
                                                    <Users size={14} className="text-primary" />
                                                    {t("status")}: {session?.status ? t(session.status) : t("idle")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                {session?.status === "open" && (
                                    <div className="h-1 w-full bg-muted relative">
                                        <div className="absolute inset-y-0 left-0 bg-primary/20 animate-pulse w-full" />
                                    </div>
                                )}
                            </Card>

                            {/* Stats Card */}
                            <Card className="rounded-2xl border border-border bg-card shadow-sm animate-enter [animation-delay:200ms] text-start">
                                <CardHeader className="pb-2 text-start">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-start">{t("session_statistics")}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-start">
                                    <div className="text-5xl font-black tracking-tighter text-foreground text-start">{attendanceRate}%</div>
                                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary text-start">
                                        <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${attendanceRate}%` }} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4 text-start">
                                        <div className="p-3 rounded-xl bg-muted/50 border border-border text-start">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 text-start">{t("present")}</p>
                                            <p className="text-lg font-bold text-green-600 dark:text-green-400 text-start">{presentCount}</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-muted/50 border border-border text-start">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 text-start">{t("status")}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase text-start">{session?.status ? t(session.status) : t("not_available")}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* ── Table ─────────────────────────────────────────── */}
                <div className="animate-enter [animation-delay:300ms] text-start">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden text-start">
                            <CardHeader className="flex flex-row items-center justify-between p-6 bg-muted/30 border-b border-border text-start">
                                <div className="flex items-center gap-4 text-start">
                                    <CardTitle className="text-xl font-bold text-start">{t("session_attendance")}</CardTitle>
                                    {session?.status === "open" && (
                                        <Badge variant="outline" className="rounded-lg bg-green-500/10 text-green-600 border-green-500/20 text-[10px] uppercase font-bold tracking-widest h-6">
                                            {t("real_time_feed")}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-2 text-start">
                                    {session?.status === "open" && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="rounded-lg h-9 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold gap-2 text-xs uppercase tracking-widest">
                                                    <Plus size={14} /> {t("add_student")}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-2xl border-border bg-card text-start">
                                                <DialogHeader className="text-start">
                                                    <DialogTitle className="text-start">{t("manual_attendance")}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4 text-start">
                                                    <div className="space-y-2 text-start">
                                                        <Label className="text-start">{t("select_student")}</Label>
                                                        <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
                                                            <SelectTrigger className="rounded-xl border-border text-start">
                                                                <SelectValue placeholder={t("choose_student")} />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-border text-start">
                                                                {allStudents
                                                                        .filter(student => {
                                                                            const sub = session?.schedule?.subject || session?.subject;
                                                                            const alreadyMarked = attendance.find(a => a.student?._id === student._id);
                                                                            if (alreadyMarked) return false;
                                                                            if (!sub) return true;

                                                                            // Helper to extract string value from potential reference or nested object
                                                                            const getString = (val: any) => {
                                                                                if (!val) return "";
                                                                                if (typeof val === "string") return val;
                                                                                if (val.code) return val.code;
                                                                                if (val.name) return val.name;
                                                                                if (val.title) return val.title;
                                                                                return "";
                                                                            };

                                                                            const studentLevel = getString(student.level).trim().toUpperCase();
                                                                            const subLevel = getString(sub.level).trim().toUpperCase();
                                                                            const studentField = getString(student.studyField).trim().toLowerCase();
                                                                            const subField = getString(sub.studyField).trim().toLowerCase();
                                                                            const studentSpecialty = getString(student.specialty).trim().toLowerCase();
                                                                            const subSpecialty = getString(sub.specialty).trim().toLowerCase();
                                                                            const subType = (sub.type || "").trim().toLowerCase();

                                                                            // 1. Level and StudyField MUST match always
                                                                            // Relax matching for StudyField (lenient check)
                                                                            const fieldMatch = studentField === subField || 
                                                                                             (studentField.length > 2 && subField.startsWith(studentField)) ||
                                                                                             (subField.length > 2 && studentField.startsWith(subField));
                                                                            
                                                                            if (studentLevel !== subLevel || !fieldMatch) return false;

                                                                            // 2. Specialty must match if defined on subject
                                                                            if (subSpecialty && subSpecialty !== "all" && subSpecialty !== "none") {
                                                                                if (studentSpecialty !== subSpecialty) return false;
                                                                            }

                                                                            // 3. Group match based on Type (TD/TP only)
                                                                            if (subType === "td" || subType === "tp") {
                                                                                const sessionGroup = (session as any)?.group?.trim().toUpperCase();
                                                                                const subGroup = (sub.group || "").trim().toUpperCase();
                                                                                const targetGroup = sessionGroup || subGroup;
                                                                                
                                                                                if (!targetGroup || targetGroup === "ALL") return true;
                                                                                return student.group?.trim().toUpperCase() === targetGroup;
                                                                            }

                                                                            // For "Cours", all students from the Level/Specialty/StudyField match are eligible
                                                                            return true;
                                                                        })
                                                                    .map(student => (
                                                                        <SelectItem key={student._id} value={student._id} className="rounded-lg text-start">
                                                                            {student.firstName} {student.lastName} ({student.matricule}) — {student.group}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button onClick={handleAddAttendance} className="w-full rounded-xl h-11 font-bold uppercase text-[10px] tracking-widest" disabled={!selectedStudentId}>
                                                        {t("mark_as_present")}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                    <Button variant="outline" size="sm" className="rounded-lg h-9 border-border bg-background hover:bg-muted font-bold gap-2 text-[10px] uppercase tracking-widest" onClick={() => handleExport("excel")} disabled={!session}>
                                        <FileSpreadsheet size={14} /> XLS
                                    </Button>
                                    <Button variant="outline" size="sm" className="rounded-lg h-9 border-border bg-background hover:bg-muted font-bold gap-2 text-[10px] uppercase tracking-widest" onClick={() => handleExport("pdf")} disabled={!session}>
                                        <FileText size={14} /> PDF
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto text-start">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="w-[60px] text-[10px] font-bold uppercase tracking-widest py-4 ltr:pl-6 rtl:pr-6 text-start">#</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-start">{t("student_name")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-start">{t("student_id")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">{t("timestamp")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">{t("status")}</TableHead>
                                            <TableHead className="w-[100px] ltr:text-right rtl:text-left py-4 ltr:pr-6 rtl:pl-6 text-start"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="text-start">
                                        {!session || attendance.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground/50 text-start">
                                                    <div className="flex flex-col items-center justify-center space-y-3 text-start">
                                                        <Users size={32} />
                                                        <p className="text-sm font-bold uppercase tracking-widest text-start">
                                                            {!session ? t("start_session_monitor") : t("awaiting_biometric")}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            attendance.map((record, idx) => (
                                                <TableRow key={record._id} className="border-border group hover:bg-muted/30 transition-colors duration-200 text-start">
                                                    <TableCell className="font-mono text-[10px] text-muted-foreground pl-6 text-start">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell className="text-start">
                                                        <div className="text-start">
                                                            <p className="font-bold text-sm text-foreground text-start">
                                                                {record.student?.firstName ? `${record.student.firstName} ${record.student.lastName}` : (record.student?.user?.name || t("unknown"))}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter text-start">
                                                                {record.student?.studyField || record.student?.specialty || t("general")} • {record.student?.group || "G1"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground font-bold ltr:text-left rtl:text-right text-start">{record.student?.matricule}</TableCell>
                                                    <TableCell className="text-center font-bold text-[10px] text-muted-foreground">
                                                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={record.status === 'present' ? 'badge-present' : 'badge-late'}>
                                                            {t(record.status).toUpperCase()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="ltr:text-right rtl:text-left ltr:pr-8 rtl:pl-8 text-start">
                                                        <div className="flex ltr:justify-end rtl:justify-start">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDelete(record._id)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
