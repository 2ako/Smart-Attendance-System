"use client";

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import {
    FileText,
    History,
    ShieldCheck,
    CheckCircle2,
    FileUp,
    Paperclip,
    Send,
    Calendar,
    ExternalLink
} from "lucide-react";

function JustificationsContent() {
    const { t, lang } = useTranslation();
    const { user } = useAuth();
    const [justifications, setJustifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [reason, setReason] = useState("");
    const [absences, setAbsences] = useState<any[]>([]);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);

    useEffect(() => {
        if (!user?.id) return;
        async function loadHistory() {
            try {
                const res = await fetch("/api/student/justifications");
                if (res.ok) {
                    const data = await res.json();
                    const mappedData = (data.justifications || []).map((item: any) => ({
                        ...item,
                        createdAt: item.submissionDate || item._createdAt
                    }));
                    setJustifications(mappedData);
                }
            } catch (error) {
                console.error("Error loading justifications:", error);
            } finally {
                setIsLoading(false);
            }
        }

        async function loadAbsences() {
            try {
                const studentRes = await fetch(`/api/attendance?studentId=${user?.id}&status=absent&isJustified=false`);
                if (studentRes.ok) {
                    const data = await studentRes.json();
                    setAbsences(data.attendance || []);
                }
            } catch (error) {
                console.error("Error loading absences for selection:", error);
            }
        }

        loadHistory();
        loadAbsences();
    }, [user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title || !reason || selectedDates.length === 0) {
            toast.error(t("fill_all_fields") || "Please fill all fields, select dates, and attach a document.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", reason);
            formData.append("file", file);
            formData.append("justifiedDates", JSON.stringify(selectedDates));

            const res = await fetch("/api/student/justifications", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to submit");
            }

            const data = await res.json();
            const newJustification = {
                ...data.justification,
                createdAt: data.justification.submissionDate || new Date().toISOString()
            };

            setJustifications([newJustification, ...justifications]);
            setTitle("");
            setReason("");
            setFile(null);
            setSelectedDates([]);

            // Refresh absences list
            const studentRes = await fetch(`/api/attendance?studentId=${user?.id}&status=absent&isJustified=false`);
            if (studentRes.ok) {
                const data = await studentRes.json();
                setAbsences(data.attendance || []);
            }

            toast.success(t("submission_history"));
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.message || "Failed to submit justification.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDateSelection = (dateIso: string) => {
        setSelectedDates(prev =>
            prev.includes(dateIso) ? prev.filter(d => d !== dateIso) : [...prev, dateIso]
        );
    };

    // Group absences by day
    const groupedAbsences = absences.reduce((acc: any, abs: any) => {
        const dateIso = new Date(abs.timestamp).toISOString().split('T')[0];
        if (!acc[dateIso]) {
            acc[dateIso] = {
                iso: dateIso,
                displayDate: new Date(abs.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                subjects: []
            };
        }
        acc[dateIso].subjects.push(abs.session?.schedule?.subject?.name || t("unknown_module"));
        return acc;
    }, {});

    const absenceDays = Object.values(groupedAbsences);

    const statusColors: any = {
        pending: "bg-orange-500/10 text-orange-600 border-orange-500/20",
        approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="space-y-10 animate-enter max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col gap-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                            <ShieldCheck className="text-primary" size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("administrative_requests")}</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                            {t("justifications")}
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            {t("absence_justification_desc")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        {/* New Submission Form */}
                        <div className="space-y-6">
                            <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-2xl shadow-primary/5">
                                <CardHeader className="p-10 pb-0">
                                    <div className="flex items-center gap-4 text-start">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                                            <FileUp className="text-primary" size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <CardTitle className="text-2xl font-black uppercase tracking-tight">{t("new_submission")}</CardTitle>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("upload_supporting_docs")}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-10">
                                    <form onSubmit={handleSubmit} className="space-y-6 text-start">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-2 rtl:mr-2">{t("document_title")}</label>
                                            <Input
                                                placeholder="e.g. Medical Certificate - Influenza"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                className="h-14 rounded-2xl bg-muted/30 border-none focus:bg-background transition-all font-bold px-6"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-2 rtl:mr-2">{t("context_reason")}</label>
                                            <Textarea
                                                placeholder="Provide brief context for the administration review..."
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                                className="min-h-[100px] rounded-2xl bg-muted/30 border-none focus:bg-background transition-all font-medium p-6"
                                            />
                                        </div>

                                        {absenceDays.length > 0 ? (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-2 rtl:mr-2">{t("select_days_to_justify")}</label>
                                                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-none">
                                                    {(absenceDays as any[]).map((day) => (
                                                        <div
                                                            key={day.iso}
                                                            onClick={() => toggleDateSelection(day.iso)}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                                                selectedDates.includes(day.iso)
                                                                    ? "bg-primary/10 border-primary"
                                                                    : "bg-muted/20 border-border/50 hover:bg-muted/40"
                                                            )}
                                                        >
                                                            <div className="flex flex-col text-start">
                                                                <span className="text-xs font-bold text-foreground capitalize">{day.displayDate}</span>
                                                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                                    {t("absent")}: {day.subjects.join(", ")}
                                                                </span>
                                                            </div>
                                                            {selectedDates.includes(day.iso) && <ShieldCheck size={16} className="text-primary" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-10 rounded-3xl border-2 border-dashed border-border/50 bg-muted/5 text-center space-y-2">
                                                <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {t("no_absences_to_justify") || (lang === "ar" ? "لا توجد غيابات غير مبررة" : "Aucune absence à justifier")}
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-2 rtl:mr-2">{t("file_attachment")}</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                />
                                                <div className={cn(
                                                    "h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all",
                                                    file ? "bg-primary/5 border-primary/50" : "bg-muted/10 border-border group-hover:border-primary/30"
                                                )}>
                                                    <Paperclip className={cn("transition-colors", file ? "text-primary" : "text-muted-foreground")} size={24} />
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-foreground">
                                                            {file ? file.name : t("tap_to_change")}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">{t("max_size")}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !file || !title}
                                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                                    <span>Processing...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Send size={16} />
                                                    <span>{t("submit_for_review")}</span>
                                                </div>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* History */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                                <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{t("submission_history")}</h2>
                                <Badge variant="secondary" className="rounded-lg bg-muted text-[10px] font-black uppercase tracking-widest">{justifications.length}</Badge>
                            </div>

                            <div className="space-y-4">
                                {isLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <Card key={i} className="h-32 animate-pulse bg-muted border-none rounded-3xl" />
                                    ))
                                ) : justifications.length === 0 ? (
                                    <Card className="rounded-[2rem] border-border/50 bg-card/50 p-12 text-center flex flex-col items-center justify-center space-y-4 border-dashed">
                                        <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                                            <History size={32} className="text-muted-foreground/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground/70">{t("no_history_found")}</p>
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{t("submit_first_desc")}</p>
                                        </div>
                                    </Card>
                                ) : (
                                    justifications.map((item) => (
                                        <Card key={item._id} className="group rounded-3xl border-border/50 bg-card hover:bg-muted/10 transition-all duration-300 overflow-hidden flex flex-col relative text-start">
                                            <div className="p-6 flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                                    <FileText className="text-muted-foreground group-hover:text-primary" size={24} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-50">{t("ref")}: #{item._id.toUpperCase()}</span>
                                                        <Badge variant="outline" className={cn("rounded-lg font-black text-[9px] uppercase tracking-widest px-2 py-0.5 border", statusColors[item.status])}>
                                                            {t(item.status).toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <h3 className="font-bold text-foreground line-clamp-1">{item.title}</h3>
                                                    <div className="flex items-center justify-between pt-2">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            <Calendar size={12} className="opacity-50" />
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </div>
                                                        <Button
                                                            variant="link"
                                                            className="p-0 h-auto text-primary font-black uppercase text-[10px] tracking-widest gap-1 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1"
                                                            onClick={() => item.fileUrl && window.open(item.fileUrl, '_blank')}
                                                        >
                                                            {t("view_doc")}
                                                            <ExternalLink size={12} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function JustificationsPage() {
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
            <JustificationsContent />
        </Suspense>
    );
}
