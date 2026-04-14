"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Search,
    Filter,
    Calendar,
    Clock,
    User,
    BookOpen,
    Users,
    FileText,
    ChevronRight,
    Loader2,
    LayoutGrid,
    History,
    Download,
    FileSpreadsheet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AbsenceDetailsDialog } from "@/components/admin/absence-details-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

import { useTranslation } from "@/lib/i18n/context";

export default function AbsencesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [filters, setFilters] = useState({
        level: "all",
        specialty: "all",
        group: "all",
    });

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleExportExcel = () => {
        const exportData = filteredSessions.map(s => ({
            [t('date')]: new Date(s.startTime).toLocaleDateString(),
            [t('subject')]: s.subject?.name,
            [t('code')]: s.subject?.code,
            [t('professor')]: s.professor?.name,
            [t('level')]: s.subject?.level,
            [t('specialty')]: s.subject?.specialty,
            [t('group')]: s.subject?.group,
            [t('present')]: s.attendanceCount
        }));
        exportToExcel(exportData, `${t('history')}_Export_${new Date().toLocaleDateString()}`);
        toast.success(t("export_success"));
    };

    const handleExportPDF = () => {
        const headers = [t('date'), t('subject'), t('professor'), `${t('level')}/${t('specialty')}`, t('marks')];
        const body = filteredSessions.map(s => [
            new Date(s.startTime).toLocaleDateString(),
            s.subject?.name,
            s.professor?.name,
            `${s.subject?.level} ${s.subject?.specialty || ''}`,
            s.attendanceCount
        ]);

        const title = t('faculty_attendance_history_report');
        const subtitle = `${t('filter')}: ${filters.level} | ${filters.specialty} | ${t('date')}: ${new Date().toLocaleString()}`;

        exportToPDF(title, headers, body, `${t('history')}_Report`, subtitle);
        toast.success(t("export_success"));
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.level !== "all") queryParams.append("level", filters.level);
            if (filters.specialty !== "all") queryParams.append("specialty", filters.specialty);
            if (filters.group !== "all") queryParams.append("group", filters.group);

            const res = await fetch(`/api/admin/absences?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error("Error loading absences records:", error);
            toast.error(t("error"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, filters]);

    const filteredSessions = sessions.filter(s =>
        s.subject?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.professor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subject?.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                        <History size={12} className="text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("attendance_intelligence")}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">
                                {t("academic_absences")}
                            </h1>
                            <p className="text-muted-foreground font-medium max-w-xl text-sm leading-relaxed">
                                {t("absences_description")}
                            </p>
                        </div>
                        <div className="flex gap-4 p-4 rounded-3xl bg-muted/30 border border-border/50 backdrop-blur-sm">
                            <div className="text-center px-4 border-r border-border">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("records")}</p>
                                <p className="text-sm font-black text-foreground">{sessions.length}</p>
                            </div>
                            <div className="text-center px-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("status")}</p>
                                <div className="flex items-center gap-1.5 justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-[10px] font-black text-foreground uppercase">{t("live_sync")}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── Filters & Search ──────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 animate-enter [animation-delay:100ms]">
                    <div className="md:col-span-4 relative group">
                        <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 ltr:pl-4 rtl:pr-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                            <Search size={18} />
                        </div>
                        <Input
                            placeholder={t("search")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-14 ltr:pl-12 rtl:pr-12 bg-card border-border/60 rounded-2xl font-medium focus:ring-primary/20 shadow-sm"
                        />
                    </div>

                    <div className="md:col-span-8 flex flex-wrap gap-3">
                        <Select value={filters.level} onValueChange={(val) => setFilters(f => ({ ...f, level: val }))}>
                            <SelectTrigger className="h-14 w-[130px] rounded-2xl bg-card border-border/60 font-bold uppercase text-[10px] tracking-widest">
                                <SelectValue placeholder={t("level")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border">
                                <SelectItem value="all">{t("all_levels")}</SelectItem>
                                <SelectItem value="L1">L1</SelectItem>
                                <SelectItem value="L2">L2</SelectItem>
                                <SelectItem value="L3">L3</SelectItem>
                                <SelectItem value="M1">M1</SelectItem>
                                <SelectItem value="M2">M2</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.specialty} onValueChange={(val) => setFilters(f => ({ ...f, specialty: val }))}>
                            <SelectTrigger className="h-14 w-[160px] rounded-2xl bg-card border-border/60 font-bold uppercase text-[10px] tracking-widest">
                                <SelectValue placeholder={t("specialty")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border">
                                <SelectItem value="all">{t("all_specialties")}</SelectItem>
                                <SelectItem value="Informatique">Informatique</SelectItem>
                                <SelectItem value="ISIL">ISIL</SelectItem>
                                <SelectItem value="GTR">GTR</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.group} onValueChange={(val) => setFilters(f => ({ ...f, group: val }))}>
                            <SelectTrigger className="h-14 w-[120px] rounded-2xl bg-card border-border/60 font-bold uppercase text-[10px] tracking-widest">
                                <SelectValue placeholder={t("group")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border">
                                <SelectItem value="all">{t("all_groups")}</SelectItem>
                                <SelectItem value="G1">G1</SelectItem>
                                <SelectItem value="G2">G2</SelectItem>
                                <SelectItem value="G3">G3</SelectItem>
                                <SelectItem value="G4">G4</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            onClick={() => setFilters({ level: "all", specialty: "all", group: "all" })}
                            className="h-14 px-6 rounded-2xl border-dashed font-bold uppercase text-[10px] tracking-widest hover:bg-muted"
                        >
                            {t("reset")}
                        </Button>
                    </div>
                </div>

                {/* ── Table ─────────────────────────────────────────── */}
                <div className="animate-enter [animation-delay:200ms]">
                    <Card className="rounded-[32px] border-none shadow-xl bg-card overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-[200px]">{t("temporal_context")}</TableHead>
                                        <TableHead className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("course_module")}</TableHead>
                                        <TableHead className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("instruction")}</TableHead>
                                        <TableHead className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("cohort_target")}</TableHead>
                                        <TableHead className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">{t("status")}</TableHead>
                                        <TableHead className="h-16 px-8 ltr:text-right rtl:text-left"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell colSpan={6} className="h-20 px-8">
                                                    <div className="h-4 bg-muted rounded-lg w-full opacity-50" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredSessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-[400px] text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                                    <FileText size={64} className="text-muted-foreground" />
                                                    <div className="space-y-1">
                                                        <p className="text-[12px] font-bold uppercase tracking-widest">{t("no_results")}</p>
                                                        <p className="text-[10px] font-medium text-muted-foreground">{t("try_adjusting_filters")}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSessions.map((session) => (
                                            <TableRow
                                                key={session._id}
                                                className="group border-border/50 hover:bg-muted/20 transition-all duration-300"
                                            >
                                                <TableCell className="px-8">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[11px] font-black text-foreground">
                                                            <Calendar size={12} className="text-primary/70" />
                                                            {new Date(session.startTime).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                                            <Clock size={12} />
                                                            {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8">
                                                    <div className="space-y-1">
                                                        <p className="text-[13px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                                                            {session.subject?.name}
                                                        </p>
                                                        <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                                            {session.subject?.code}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            <User size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-bold uppercase text-foreground/80 tracking-wide">
                                                            {session.professor?.name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8">
                                                    <div className="space-x-1 ltr:text-left rtl:text-right">
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/40 text-muted-foreground bg-muted/10">
                                                            {session.subject?.level}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/40 text-muted-foreground bg-muted/10">
                                                            {session.subject?.specialty}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/40 text-muted-foreground bg-muted/10">
                                                            {session.subject?.group}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className={cn(
                                                            "text-[12px] font-black tabular-nums",
                                                            session.attendanceCount > 0 ? "text-primary" : "text-destructive"
                                                        )}>
                                                            {session.attendanceCount} {t("marks")}
                                                        </span>
                                                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${Math.min(100, (session.attendanceCount / 30) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 ltr:text-right rtl:text-left">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedSessionId(session._id);
                                                            setIsDetailsOpen(true);
                                                        }}
                                                        className="h-10 w-10 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all ltr:rotate-0 rtl:rotate-180"
                                                    >
                                                        <ChevronRight size={18} strokeWidth={3} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="lg:hidden p-4 space-y-4">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-[2.5rem]" />
                                ))
                            ) : filteredSessions.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <FileText size={48} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_results")}</p>
                                </div>
                            ) : (
                                filteredSessions.map((session) => (
                                    <div
                                        key={session._id}
                                        onClick={() => {
                                            setSelectedSessionId(session._id);
                                            setIsDetailsOpen(true);
                                        }}
                                        className="p-6 rounded-[2.5rem] bg-card border border-border/50 shadow-sm space-y-4 active:scale-[0.98] transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <Calendar size={18} className="text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-foreground uppercase">{new Date(session.startTime).toLocaleDateString()}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                "rounded-lg px-3 py-1 font-black text-[10px] uppercase",
                                                session.attendanceCount > 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                                            )}>
                                                {session.attendanceCount} {t("marks")}
                                            </Badge>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-extrabold text-lg text-foreground uppercase tracking-tight leading-tight">{session.subject?.name}</h3>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{session.subject?.code}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div className="px-4 py-3 rounded-2xl bg-muted/20 border border-border/50">
                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("professor")}</p>
                                                <p className="text-[11px] font-bold text-foreground truncate">{session.professor?.name}</p>
                                            </div>
                                            <div className="px-4 py-3 rounded-2xl bg-muted/20 border border-border/50">
                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("target")}</p>
                                                <p className="text-[11px] font-bold text-foreground truncate">{session.subject?.level} {session.subject?.specialty}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </main>

            <AbsenceDetailsDialog
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                sessionId={selectedSessionId}
            />
        </div>
    );
}
