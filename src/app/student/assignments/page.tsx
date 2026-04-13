"use client";

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Calendar, CheckCircle2, ChevronRight, ClipboardList, Clock, Filter, LayoutGrid, ListIcon, Megaphone, Search, Trophy, User, Hourglass, AlertCircle } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AssignmentDetailDialog } from "@/components/student/assignment-detail-dialog";

import { useTranslation } from "@/lib/i18n/context";

function AssignmentsContent() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const assignmentIdParam = searchParams.get("assignmentId");

    const [assignments, setAssignments] = useState<any[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleViewAssignment = (assignment: any) => {
        setSelectedAssignment(assignment);
        setIsDetailOpen(true);
    };

    // Auto-open assignment if ID is in URL
    useEffect(() => {
        if (assignments.length > 0 && assignmentIdParam) {
            const assignment = assignments.find(a => a._id === assignmentIdParam);
            if (assignment) {
                handleViewAssignment(assignment);
            }
        }
    }, [assignments, assignmentIdParam]);

    useEffect(() => {
        async function loadData() {
            if (!user?.id) return;
            try {
                // Fetch assignments and student profile in parallel
                const [assignRes, profileRes] = await Promise.all([
                    fetch("/api/assignments"),
                    fetch("/api/student/profile")
                ]);

                if (assignRes.ok) {
                    const data = await assignRes.json();
                    setAssignments(data.assignments || []);
                }

                if (profileRes.ok) {
                    const data = await profileRes.json();
                    setStudentProfile(data.student);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user?.id]);

    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !typeFilter || a.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getStatusInfo = (a: any) => {
        if (a.type === "affichage") {
            return { label: t("announcement"), color: "text-blue-600 bg-blue-500/10 border-blue-500/20", icon: Megaphone };
        }

        const now = new Date();
        const due = new Date(a.dueDate);
        const diff = due.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (diff < 0) return { label: t("expired"), color: "text-red-600 bg-red-500/10 border-red-500/20", icon: AlertCircle };
        if (days <= 2) return { label: t("urgent"), color: "text-orange-600 bg-orange-500/10 border-orange-500/20", icon: Clock };
        return { label: t("active"), color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 };
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="space-y-10 animate-enter">
                    {/* Header */}
                    <div className="flex flex-col gap-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                            <Trophy className="text-primary" size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("academic_excellence")}</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                                        {t("assignments")}
                                    </h1>
                                    {studentProfile?.specialty || studentProfile?.level ? (
                                        <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider animate-pulse shadow-sm shadow-primary/20">
                                            {studentProfile.level} {studentProfile.specialty}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="h-8 px-4 rounded-xl border-muted-foreground/20 bg-muted/5 text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest">
                                            {t("no_level_specialty")}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground font-medium max-w-2xl">
                                    {t("attendance_track_desc")}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode("grid")}
                                    className={cn("h-10 w-10 rounded-xl transition-all", viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                >
                                    <LayoutGrid size={18} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode("list")}
                                    className={cn("h-10 w-10 rounded-xl transition-all", viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                >
                                    <ListIcon size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder={t("search_module_placeholder")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ltr:pl-11 rtl:pr-11 h-12 rounded-2xl bg-muted/30 border-none focus:bg-background transition-all font-medium"
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-12 px-6 gap-2 rounded-2xl border-border bg-card hover:bg-muted font-bold text-xs">
                                    <Filter size={16} />
                                    {typeFilter ? t(typeFilter).toUpperCase() : t("all_types").toUpperCase()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-border bg-card">
                                <DropdownMenuItem onClick={() => setTypeFilter(null)} className="font-bold">{t("all_types").toUpperCase()}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTypeFilter("homework")} className="font-bold">{t("homework").toUpperCase()}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTypeFilter("project")} className="font-bold">{t("project").toUpperCase()}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTypeFilter("quiz")} className="font-bold">{t("quiz").toUpperCase()}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTypeFilter("exam")} className="font-bold">{t("exam").toUpperCase()}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array(6).fill(0).map((_, i) => (
                                <Card key={i} className="h-64 animate-pulse bg-muted/50 border-none rounded-3xl" />
                            ))}
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
                                <ClipboardList size={40} className="text-muted-foreground/30" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-foreground">{t("no_assignments_found")}</h3>
                                <p className="text-sm text-muted-foreground">{t("adjust_filters")}</p>
                            </div>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredAssignments.map((a) => {
                                const isAffichage = a.type === "affichage";
                                const status = getStatusInfo(a);
                                const StatusIcon = status.icon;
                                return (
                                    <Card key={a._id} className="group rounded-3xl border-border/50 bg-card hover:bg-muted/10 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 overflow-hidden flex flex-col relative text-start">
                                        <div className="absolute top-0 ltr:right-0 rtl:left-0 p-6 flex flex-col items-end gap-2">
                                            <Badge variant="outline" className={cn("rounded-lg font-bold text-[9px] uppercase tracking-widest px-2.5 py-1", status.color)}>
                                                <StatusIcon size={10} className="ltr:mr-1 rtl:ml-1" />
                                                {status.label}
                                            </Badge>
                                            {a.submission?.status === "graded" && !isAffichage && (
                                                <Badge className="bg-green-500 hover:bg-green-600 text-white border-none rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 animate-pulse shadow-lg shadow-green-500/20">
                                                    <Trophy size={10} className="ltr:mr-1 rtl:ml-1" />
                                                    {t("graded").toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardHeader className="p-8 pb-4">
                                            <div className="space-y-3">
                                                {a.subject?.professor?.fullName && (
                                                    <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-primary/5 border border-primary/10 w-fit shadow-inner">
                                                        <div className="h-5 w-5 rounded-lg bg-primary/20 flex items-center justify-center">
                                                            <User size={10} className="text-primary" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                                            {t("prof")}. {a.subject.professor.fullName}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                    <BookOpen size={12} className="text-muted-foreground/30" />
                                                    {a.subject?.name || t("general")}
                                                    <span className="ltr:ml-1 rtl:mr-1 px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground text-[8px] font-black tracking-widest">
                                                        {a.subject?.level} {a.subject?.specialty || a.subject?.degree}
                                                    </span>
                                                </div>
                                                <CardTitle className="text-xl font-black leading-tight group-hover:text-primary transition-colors">
                                                    {a.title}
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 flex-1 flex flex-col justify-between gap-8">
                                            <div className="space-y-4">
                                                <p className="text-muted-foreground text-sm font-medium line-clamp-3 leading-relaxed">
                                                    {a.description || t("no_description")}
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-muted-foreground/50" />
                                                        <span>{t("due")}: {new Date(a.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    {!isAffichage && (
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={14} className="text-muted-foreground/50" />
                                                            <span>{a.points} {t("points")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={() => handleViewAssignment(a)}
                                                    className="w-full h-12 rounded-2xl bg-muted/50 hover:bg-primary hover:text-primary-foreground group-hover:shadow-lg transition-all font-black uppercase text-[10px] tracking-widest gap-2 border-border/50 text-foreground"
                                                >
                                                    {t("view_details")}
                                                    <ChevronRight size={14} className="rtl:rotate-180" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-start">
                                    <thead className="bg-muted/30 border-b border-border/50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("assignment")}</th>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t("module")}</th>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Type</th>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t("due_date")}</th>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("status")}</th>
                                            <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-start ltr:pr-12 rtl:pl-12">{t("action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {filteredAssignments.map((a) => {
                                            const status = getStatusInfo(a);
                                            const isAffichage = a.type === "affichage";
                                            return (
                                                <tr key={a._id} className="group hover:bg-muted/20 transition-colors">
                                                    <td className="p-6 text-start">
                                                        {a.subject?.professor?.fullName && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-tighter">{t("prof")}</span>
                                                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">{a.subject.professor.fullName}</span>
                                                            </div>
                                                        )}
                                                        <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{a.title}</div>
                                                        {!isAffichage && (
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-muted-foreground/20 px-1.5 py-0 h-5">
                                                                    {a.points} {t("points").toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge variant="secondary" className="bg-secondary/50 text-[10px] font-bold uppercase tracking-widest border-none">
                                                                {a.subject?.code || "N/A"}
                                                            </Badge>
                                                            <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest whitespace-nowrap">
                                                                {a.subject?.level} {a.subject?.specialty || a.subject?.degree}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                        {t(a.type).toUpperCase()}
                                                    </td>
                                                    <td className="p-6 text-center text-xs font-bold text-foreground">
                                                        {new Date(a.dueDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-6 text-start">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Badge variant="outline" className={cn("rounded-lg font-bold text-[9px] uppercase tracking-widest px-2.5 py-1", status.color)}>
                                                                {status.label}
                                                            </Badge>
                                                            {a.submission?.status === "graded" && !isAffichage && (
                                                                <Badge className="bg-green-500 text-white border-none rounded-lg font-black text-[8px] uppercase tracking-widest px-2 py-0.5 shadow-sm">
                                                                    {t("graded").toUpperCase()}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-start ltr:pr-12 rtl:pl-12">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewAssignment(a)}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            <ChevronRight size={16} className="rtl:rotate-180" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            </main>

            <AssignmentDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                assignment={selectedAssignment}
            />
        </div>
    );
}

export default function AssignmentsPage() {
    const { t } = useTranslation();
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-background items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("synchronizing_records")}</p>
                </div>
            </div>
        }>
            <AssignmentsContent />
        </Suspense>
    );
}
