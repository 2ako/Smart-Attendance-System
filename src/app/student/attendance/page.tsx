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
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
    Activity,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    BookOpen,
    Filter,
    MapPin
} from "lucide-react";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/context";

export default function AttendanceHistoryPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const perPage = 8;

    useEffect(() => {
        async function loadData() {
            if (!user?.id) return;
            try {
                // 1. Fetch Student Profile & Stats
                const profileRes = await fetch("/api/student/profile");
                if (!profileRes.ok) throw new Error("Profile not found");
                const { student: studentData, stats: statsData } = await profileRes.json();
                setStats(statsData);

                // 2. Fetch Attendance Records List
                const recordsRes = await fetch(`/api/attendance?studentId=${studentData._id}`).then(res => res.json());
                setAttendance(recordsRes.attendance || []);
            } catch (error) {
                console.error("Error loading attendance history:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user?.id]);

    const statusConfig: any = {
        present: { label: t("present").toUpperCase(), class: "badge-present", icon: CheckCircle2 },
        late: { label: t("late").toUpperCase(), class: "badge-late", icon: Clock },
        absent: { label: t("absent").toUpperCase(), class: "badge-absent", icon: AlertCircle },
    };

    const filteredData = attendance.filter(record => {
        const matchesSearch = record.session?.schedule?.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.session?.schedule?.subject?.code?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || record.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil(filteredData.length / perPage);

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="space-y-10 animate-enter">
                    {/* Header section */}
                    <div className="flex flex-col gap-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                            <Calendar className="text-primary" size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("academic_track")}</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                            {t("attendance_history")}
                        </h1>
                        <p className="text-muted-foreground font-medium max-w-2xl">
                            {t("attendance_history_desc")}
                        </p>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <Card key={i} className="animate-pulse bg-muted h-24 border-none rounded-2xl" />
                            ))
                        ) : (
                            <>
                                <StatCard label={t("total_sessions")} value={stats.total} icon={BookOpen} color="primary" />
                                <StatCard label={t("present")} value={stats.present} icon={CheckCircle2} color="green" />
                                <StatCard label={t("late")} value={stats.late} icon={Clock} color="orange" />
                                <StatCard label={t("absent")} value={stats.absent} icon={AlertCircle} color="red" />
                            </>
                        )}
                    </div>

                    {/* Controls & Table */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full md:w-96 group">
                                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder={t("search_module_placeholder")}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(1);
                                    }}
                                    className="ltr:pl-10 rtl:pr-10 h-11 rounded-xl bg-muted/30 border-input focus:bg-background transition-all"
                                />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-11 px-4 gap-2 rounded-xl border-border bg-card hover:bg-muted font-bold">
                                        <Filter size={16} />
                                        {statusFilter ? t(statusFilter).toUpperCase() : t("all_status").toUpperCase()}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-border bg-card">
                                    <DropdownMenuItem onClick={() => setStatusFilter(null)} className="font-bold">{t("all_status").toUpperCase()}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("present")} className="font-bold text-green-600">{t("present").toUpperCase()}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("late")} className="font-bold text-orange-600">{t("late").toUpperCase()}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("absent")} className="font-bold text-red-600">{t("absent").toUpperCase()}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {isLoading ? (
                            <TableSkeleton />
                        ) : (
                            <Card className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-border hover:bg-transparent">
                                                <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-widest py-4 ltr:pl-6 rtl:pr-6 text-muted-foreground text-start">#</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-muted-foreground text-start">{t("module_info")}</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center text-muted-foreground">{t("time_date")}</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center text-muted-foreground">{t("location")}</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-start ltr:pr-6 rtl:pl-6 text-muted-foreground">{t("status")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-64 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground/50">
                                                            <Search size={48} className="opacity-20" />
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-bold text-foreground/70">{t("no_records_found")}</p>
                                                                <p className="text-xs">{t("adjust_filters")}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedData.map((record, idx) => {
                                                    const Config = statusConfig[record.status] || statusConfig.absent;
                                                    return (
                                                        <TableRow key={record._id} className="border-border group hover:bg-muted/20 transition-all duration-200">
                                                            <TableCell className="text-muted-foreground font-mono text-xs ltr:pl-6 rtl:pr-6 text-start">
                                                                {((page - 1) * perPage + idx + 1).toString().padStart(2, '0')}
                                                            </TableCell>
                                                            <TableCell className="text-start">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                                        {record.session?.schedule?.subject?.name || t("independent_session")}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                        {record.session?.schedule?.subject?.code || t("n_a")}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-xs font-bold text-foreground">
                                                                        {new Date(record.timestamp).toLocaleDateString(undefined, {
                                                                            weekday: 'short',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </span>
                                                                    <Badge variant="secondary" className="bg-secondary/50 text-[9px] font-mono font-bold border-none">
                                                                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                                                    <MapPin size={12} className="text-primary/50" />
                                                                    <span>{record.session?.schedule?.room || record.session?.room || t("outdoor")}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-start ltr:pr-6 rtl:pl-6">
                                                                <span className={Config.class}>
                                                                    {Config.label}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {totalPages > 1 && (
                                    <div className="p-6 border-t border-border/50 bg-muted/5 flex items-center justify-between">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {t("page_x_of_y").replace("{page}", page.toString()).replace("{total}", totalPages.toString())}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 px-3 rounded-lg font-bold border-border bg-background"
                                                onClick={() => setPage(Math.max(1, page - 1))}
                                                disabled={page === 1}
                                            >
                                                <ChevronLeft size={16} className="ltr:mr-1 rtl:ml-1 rtl:rotate-180" /> {t("previous")}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 px-3 rounded-lg font-bold border-border bg-background"
                                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                disabled={page === totalPages}
                                            >
                                                {t("next")} <ChevronRight size={16} className="ltr:ml-1 rtl:mr-1 rtl:rotate-180" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: any) {
    const colors: any = {
        primary: "bg-primary/10 text-primary",
        green: "bg-green-500/10 text-green-600 dark:text-green-400",
        orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
        red: "bg-red-500/10 text-red-600 dark:text-red-400",
    };

    return (
        <Card className="rounded-2xl border border-border/50 bg-card hover:bg-muted/10 transition-colors shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" />
            <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    <div className={`p-1.5 rounded-lg ${colors[color]}`}>
                        <Icon size={14} />
                    </div>
                </div>
                <div className="text-3xl font-black group-hover:scale-105 transition-transform origin-left">{value}</div>
            </CardContent>
        </Card>
    );
}
