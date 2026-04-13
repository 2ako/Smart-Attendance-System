"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    FileText,
    Search,
    Loader2,
    Download,
    FileSpreadsheet
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

interface AbsenceDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: string | null;
}

export function AbsenceDetailsDialog({
    open,
    onOpenChange,
    sessionId,
}: AbsenceDetailsDialogProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<{ session: any; cohort: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (open && sessionId) {
            fetchData();
        } else {
            setData(null);
            setSearchTerm("");
        }
    }, [open, sessionId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/absences?sessionId=${sessionId}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error("Error fetching session details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = (format: "excel" | "pdf") => {
        if (!sessionId) return;
        window.open(`/api/export/${format}?sessionId=${sessionId}`, "_blank");
        toast.success(`${format.toUpperCase()} report generated`);
    };

    const filteredCohort = data?.cohort.filter((student: any) =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const absentCount = data?.cohort.filter((s: any) => !s.attendance).length || 0;
    const presentCount = data?.cohort.filter((s: any) => s.attendance).length || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden border-none shadow-2xl rounded-[32px] p-0 bg-card flex flex-col">
                {/* ── Header ── */}
                <div className="p-8 pb-0 shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Users size={20} />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground leading-tight">
                                {t("session_attendance")}
                            </DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {data?.session?.subject?.name || t("loading")} • {data?.session ? new Date(data.session.startTime).toLocaleDateString() : t("loading")}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-[10px] font-black uppercase bg-green-500/10 text-green-600 border-green-500/20">
                                {presentCount} {t("present")}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-black uppercase bg-destructive/10 text-destructive border-destructive/20">
                                {absentCount} {t("absent")}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 bg-muted/20 border-none hover:bg-primary hover:text-primary-foreground transition-all">
                                        <Download size={14} /> {t("export")}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-border p-1">
                                    <DropdownMenuItem onClick={() => handleExport("excel")} className="rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                                        <FileSpreadsheet size={14} className="text-emerald-500" /> {t("excel_workbook")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                                        <FileText size={14} className="text-rose-500" /> {t("pdf_document")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="relative mt-4">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t("find_student_placeholder")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl text-sm font-medium focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-4 scrollbar-none">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <Loader2 size={40} className="animate-spin text-primary/40 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("syncing_records")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredCohort?.map((student: any) => (
                                <div
                                    key={student._id}
                                    className={cn(
                                        "group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                        student.attendance
                                            ? "bg-muted/10 border-border/40 hover:border-primary/20"
                                            : "bg-destructive/5 border-destructive/10 hover:border-destructive/30"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                                            student.attendance ? "bg-primary/5 text-primary" : "bg-destructive/10 text-destructive"
                                        )}>
                                            {student.attendance ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-foreground uppercase tracking-tight">
                                                {student.fullName}
                                            </p>
                                            <p className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-widest leading-none mt-1">
                                                ID: {student.matricule} • {student.attendance ? `${t("joined_at")} ${new Date(student.attendance.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : t("no_presence_detected")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {student.attendance ? (
                                            <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">
                                                {student.attendance.status}
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="border-none text-[8px] font-black uppercase">
                                                {t("absent")}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="p-8 pt-0 mt-auto shrink-0 border-t border-border/50 bg-muted/5">
                    <div className="py-6">
                        <Button
                            onClick={() => onOpenChange(false)}
                            className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl transition-all"
                        >
                            {t("close")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
