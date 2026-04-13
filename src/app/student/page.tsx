"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
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
    Activity,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

import { sanityClient } from "@/lib/sanity/client";
import { getStudentByUserId, getAttendanceByStudent, getAttendanceCount } from "@/lib/sanity/queries";

import { useTranslation } from "@/lib/i18n/context";

export default function StudentDashboard() {
    const { t, lang } = useTranslation();
    const { user } = useAuth();
    const [student, setStudent] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        unexcusedAbsences: 0,
        unexcusedPerSubject: {} as Record<string, { name: string, count: number }>
    });
    const [config, setConfig] = useState({ absentThreshold: 3 });
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const perPage = 6;

    useEffect(() => {
        async function loadData() {
            if (!user?.id) return;
            try {
                // 1. Fetch Student Profile & Stats
                const profileRes = await fetch("/api/student/profile");
                if (!profileRes.ok) {
                    setIsLoading(false);
                    return;
                }
                const { student: studentData, stats: statsData, config: configData } = await profileRes.json();
                setStudent(studentData);
                setStats(statsData);
                setConfig(configData);

                // 2. Fetch Attendance Records List
                const recordsRes = await fetch(`/api/attendance?studentId=${studentData._id}`).then(res => res.json());
                setAttendance(recordsRes.attendance || []);
            } catch (error) {
                console.error("Error loading student data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user?.id]);

    const attended = stats.present + stats.late;
    const totalClasses = stats.total || 0;
    const missed = stats.absent || 0;
    const rate = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

    const paginatedData = attendance.slice((page - 1) * perPage, page * perPage);

    const statusConfig: any = {
        present: { label: t("present").toUpperCase(), class: "badge-present" },
        late: { label: t("late").toUpperCase(), class: "badge-late" },
        absent: { label: t("absent").toUpperCase(), class: "badge-absent" },
    };

    // Find the subject with the most absences
    const subjectCounts = Object.values(stats.unexcusedPerSubject || {}) as { name: string, count: number }[];
    const worstSubject = subjectCounts.sort((a, b) => b.count - a.count)[0] || { name: t("none"), count: 0 };
    const unexcusedCount = worstSubject.count;

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                {/* ── Header Section ────────────────────────────────── */}
                <div className="mb-10 animate-enter text-start">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4 text-start">
                        <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("student_dashboard")}</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-start">
                        {t("welcome")}, {user?.name?.split(" ")[0] || t("student")}
                    </h1>
                    <p className="mt-2 text-muted-foreground max-w-2xl leading-relaxed text-sm font-medium text-start">
                        {t("attendance_track_desc")}
                    </p>
                </div>

                {/* ── Stat Cards ─────────────────────────────────────── */}
                <div className="mb-10 text-start">
                    {isLoading ? (
                        <StatsSkeleton />
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 animate-enter [animation-delay:200ms] text-start">
                            <Card className="rounded-2xl border border-border bg-card shadow-sm group text-start">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 text-start">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-start">
                                        {t("attendance_rate")}
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Activity size={18} />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-start">
                                    <div className="text-4xl font-black text-start">{rate}%</div>
                                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary text-start">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${rate}%` }}
                                        />
                                    </div>
                                    <p className="mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-start">
                                        {t("target_min")}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border border-border bg-card shadow-sm group text-start">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 text-start">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-start">
                                        {t("total_attended")}
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                                        <CheckCircle2 size={18} />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-start">
                                    <div className="text-4xl font-black text-start">{attended}</div>
                                    <p className="mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-start">
                                        {t("from_sessions").replace("{total}", totalClasses.toString())}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className={cn(
                                "rounded-2xl border border-border bg-card shadow-sm group text-start",
                                unexcusedCount >= config.absentThreshold ? "border-destructive/30 shadow-destructive/5" : ""
                            )}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 text-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-start">
                                            {t("unexcused_absences")}
                                        </CardTitle>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                            {t("threshold_per_subject")}: {config.absentThreshold}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        unexcusedCount >= config.absentThreshold - 1 && unexcusedCount > 0 ? "bg-destructive/10 text-destructive" : "bg-orange-500/10 text-orange-600"
                                    )}>
                                        <AlertCircle size={18} />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-start">
                                    <div className="flex items-baseline gap-2">
                                        <div className={cn(
                                            "text-4xl font-black text-start",
                                            unexcusedCount >= config.absentThreshold - 1 && unexcusedCount > 0 ? "text-destructive" : ""
                                        )}>
                                            {unexcusedCount}
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground">/ {config.absentThreshold}</span>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary text-start">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-1000 ease-out",
                                                unexcusedCount >= config.absentThreshold ? "bg-destructive" : "bg-orange-500"
                                            )}
                                            style={{ width: `${Math.min((unexcusedCount / config.absentThreshold) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1 text-start">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-start">
                                            {unexcusedCount >= config.absentThreshold
                                                ? t("exclusion_danger")
                                                : t("keep_absence_min")}
                                        </p>
                                        {unexcusedCount > 0 && (
                                            <p className="text-[10px] font-black text-primary uppercase truncate text-start">
                                                {t("in_subject")} {worstSubject.name}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* ── Table Section ─────────────────────────────────── */}
                <div className="animate-enter [animation-delay:400ms] text-start">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden text-start">
                            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between text-start">
                                <CardTitle className="text-lg font-bold text-start">{t("attendance_records")}</CardTitle>
                                <div className="flex gap-2 text-start">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border-border bg-background hover:bg-muted"
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border-border bg-background hover:bg-muted"
                                        onClick={() => setPage(page + 1)}
                                        disabled={page * perPage >= attendance.length}
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-0 overflow-x-auto text-start">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-widest py-4 pl-6 text-start">#</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-start">{t("module_name")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">{t("date")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">{t("time")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-right pr-6 text-start">{t("status")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="text-start">
                                        {attendance.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground/50 text-start">
                                                    <div className="flex flex-col items-center justify-center space-y-3 text-start">
                                                        <Search size={32} />
                                                        <p className="text-sm font-bold uppercase tracking-widest text-start">{t("no_attendance_found")}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedData.map((record, idx) => (
                                                <TableRow key={record._id} className="border-border group hover:bg-muted/30 transition-colors duration-200 text-start">
                                                    <TableCell className="text-muted-foreground font-mono text-xs pl-6 text-start">
                                                        {((page - 1) * perPage + idx + 1).toString().padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell className="text-start">
                                                        <div className="py-1 text-start">
                                                            <p className="font-bold text-sm text-foreground text-start">{record.session?.schedule?.subject?.name || t("unknown_module")}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide text-start">{record.session?.schedule?.subject?.code}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-xs">
                                                        {new Date(record.timestamp).toLocaleDateString(undefined, {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary text-[10px] font-mono font-bold">
                                                            <span>{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 text-start">
                                                        <span className={statusConfig[record.status]?.class || "badge-absent"}>
                                                            {statusConfig[record.status]?.label || t("absent").toUpperCase()}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="p-4 bg-muted/10 border-t border-border text-start">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                                        {t("showing_logs").replace("{count}", paginatedData.length.toString()).replace("{total}", attendance.length.toString())}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
