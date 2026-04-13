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
    FileSpreadsheet,
    FileText,
    History,
    Users,
    Calendar,
    Search,
    X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { sanityClient } from "@/lib/sanity/client";
import { getProfessorByUserId, getAllSessionsByProfessor } from "@/lib/sanity/queries";
import { toast } from "sonner";

import { useTranslation } from "@/lib/i18n/context";

export default function SessionHistoryPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    const loadSessions = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/prof/sessions-history");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error("Error loading history:", error);
            toast.error(t("error_occurred"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [user?.id]);

    const handleExport = (sessionId: string, format: "excel" | "pdf") => {
        window.open(`/api/export/${format}?sessionId=${sessionId}`, "_blank");
    };

    const filteredSessions = sessions.filter(s => {
        const matchesSearch = s.schedule?.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.schedule?.subject?.code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDate = !selectedDate || new Date(s.startTime).toISOString().split('T')[0] === selectedDate;

        return matchesSearch && matchesDate;
    });

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedDate("");
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="professor" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                <div className="mb-10 animate-enter text-start">
                    <div className="flex items-center gap-3 mb-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary text-start">
                            <History size={12} />
                            {t("academic_archives")}
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                        {t("session_history")}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium text-start">
                        {t("review_past_attendance_desc")}
                    </p>
                </div>

                <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between animate-enter [animation-delay:100ms] text-start">
                    <div className="flex flex-col sm:flex-row w-full sm:max-w-3xl gap-4 text-start">
                        <div className="relative flex-1 text-start">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder={t("search_course_placeholder")}
                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-2xl bg-card border-none shadow-sm focus-visible:ring-primary/20 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative w-full sm:w-48 text-start">
                            <Calendar className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                type="date"
                                className="ltr:pl-12 rtl:pr-12 h-12 rounded-2xl bg-card border-none shadow-sm focus-visible:ring-primary/20 font-medium appearance-none"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        {(searchTerm || selectedDate) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="h-12 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground gap-2 transition-all shrink-0 text-start"
                            >
                                <X size={14} />
                                {t("clear")}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-start">
                        <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 text-primary bg-primary/5 font-bold text-start">
                            {t("total")}: {filteredSessions.length} {t("sessions")}
                        </Badge>
                    </div>
                </div>

                <div className="animate-enter [animation-delay:200ms] text-start">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Card className="rounded-3xl border-none shadow-xl shadow-black/5 bg-card overflow-hidden text-start">
                            <CardContent className="p-0 overflow-x-auto text-start">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5 ltr:pl-8 rtl:pr-8 text-start">{t("course_details")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5 text-start">{t("date_time")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5 text-center">{t("attendance")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5 text-center">{t("status")}</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5 ltr:text-right rtl:text-left ltr:pr-8 rtl:pl-8 text-start">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="text-start">
                                        {filteredSessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center text-start">
                                                    <div className="flex flex-col items-center justify-center space-y-4 text-start">
                                                        <div className="p-4 rounded-full bg-muted/50 text-start">
                                                            <Calendar size={32} className="text-muted-foreground/30" />
                                                        </div>
                                                        <div className="space-y-1 text-start">
                                                            <p className="font-bold text-muted-foreground text-start">{t("no_sessions_found")}</p>
                                                            <p className="text-xs text-muted-foreground/60 text-start">{t("no_sessions_desc")}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSessions.map((session) => (
                                                <TableRow key={session._id} className="group hover:bg-muted/30 border-border transition-colors duration-200 text-start">
                                                    <TableCell className="py-5 pl-8 text-start">
                                                        <div className="text-start">
                                                            <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors text-start">
                                                                {session.schedule?.subject?.name || t("untitled_course")}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5 text-start">
                                                                {session.schedule?.subject?.code || "N/A"} ({session.schedule?.subject?.type ? t(`format_${session.schedule.subject.type.toLowerCase()}`) : t("format_lecture")}) • {session.schedule?.room || t("room_tbd")}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-start">
                                                        <div className="space-y-0.5 text-start">
                                                            <p className="text-sm font-bold text-foreground text-start">
                                                                {new Date(session.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter text-start">
                                                                {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t("ongoing")}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border">
                                                            <Users size={12} className="text-primary/70" />
                                                            <span className="text-xs font-black text-foreground">{session.attendanceCount}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        <Badge variant={session.status === "open" ? "default" : "secondary"} className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${session.status === "open" ? "bg-primary shadow-lg shadow-primary/20 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                                                            {t(session.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-5 ltr:text-right rtl:text-left ltr:pr-8 rtl:pl-8 text-start">
                                                        <div className="flex ltr:justify-end rtl:justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-start">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-9 rounded-xl border-border bg-background hover:bg-muted font-bold text-[10px] uppercase tracking-widest gap-2 text-start"
                                                                onClick={() => handleExport(session._id, "excel")}
                                                            >
                                                                <FileSpreadsheet size={14} className="text-green-600" /> XLS
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-9 rounded-xl border-border bg-background hover:bg-muted font-bold text-[10px] uppercase tracking-widest gap-2 text-start"
                                                                onClick={() => handleExport(session._id, "pdf")}
                                                            >
                                                                <FileText size={14} className="text-red-600" /> PDF
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
