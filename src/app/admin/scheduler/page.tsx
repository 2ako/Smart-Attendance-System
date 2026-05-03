"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { 
    Cpu, 
    Sparkles, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    Settings2, 
    ArrowRight,
    Loader2
} from "lucide-react";

export default function AdminSchedulerPage() {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [view, setView] = useState<"summary" | "detailed">("summary");

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/scheduler/generate");
            const data = await res.json();
            if (data.success) {
                setResult(data);
                toast.success(t("success_occurred"));
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCommit = async () => {
        if (!result) return;
        toast.promise(
            fetch("/api/admin/scheduler/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ genes: result.schedule.genes }),
            }),
            {
                loading: t("processing"),
                success: t("success_occurred"),
                error: t("error_occurred"),
            }
        );
    };

    const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const SLOTS = [
        "08:00 - 09:30",
        "09:40 - 11:10",
        "11:20 - 12:50",
        "13:10 - 14:40",
        "14:50 - 16:20",
        "16:30 - 18:00",
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar role="admin" />
            
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
                            <Cpu size={12} />
                            {t("hybrid_ai_optimization") || "Hybrid AI Optimization"}
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">{t("smart_scheduler_title")}</h1>
                        <p className="text-muted-foreground font-medium">{t("smart_scheduler_engine_desc")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-3 group"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                            {isGenerating ? t("engine_processing") : t("initialize_generator")}
                        </Button>
                        {result && (
                            <Button
                                onClick={handleCommit}
                                variant="secondary"
                                className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                            >
                                <CheckCircle2 size={16} />
                                {t("commit_schedule")}
                            </Button>
                        )}
                    </div>
                </div>

                {!result && !isGenerating && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="rounded-3xl border-none shadow-xl bg-card/50 overflow-hidden group">
                           <CardHeader className="p-8 pb-0">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                    <Settings2 size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t("constraint_logic")}</CardTitle>
                                <CardDescription>{t("constraint_logic_desc")}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-8 pt-6">
                                <ul className="space-y-3 font-medium text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> {t("group_aware")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> {t("multi_criteria")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> {t("auto_repair")}</li>
                                </ul>
                           </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-xl bg-card/50 overflow-hidden group">
                           <CardHeader className="p-8 pb-0">
                                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                                    <Sparkles size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t("local_search")}</CardTitle>
                                <CardDescription>{t("local_search_desc")}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-8 pt-6">
                                <ul className="space-y-3 font-medium text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-amber-500" /> {t("tabu_memory")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-amber-500" /> {t("neighbor_swap")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-amber-500" /> {t("meta_heuristic")}</li>
                                </ul>
                           </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-xl bg-card/50 overflow-hidden group">
                           <CardHeader className="p-8 pb-0">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
                                    <CheckCircle2 size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t("institutional_impact")}</CardTitle>
                                <CardDescription>{t("institutional_impact_desc")}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-8 pt-6">
                                <ul className="space-y-3 font-medium text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> {t("one_click_deployment")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> {t("biometric_sync")}</li>
                                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> {t("conflict_monitoring")}</li>
                                </ul>
                           </CardContent>
                        </Card>
                    </div>
                )}

                {result && (
                    <div className="space-y-8 animate-enter">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: t("performance_score"), value: (100 - (result.stats.fitness / 10)).toFixed(1) + "%", icon: Cpu, color: "text-primary" },
                                { label: t("constraint_violations"), value: result.stats.fitness > 1000 ? (result.stats.fitness / 1000).toFixed(0) : "0", icon: AlertTriangle, color: result.stats.fitness > 0 ? "text-amber-500" : "text-emerald-500" },
                                { label: t("scheduled_subjects"), value: result.stats.totalSubjects, icon: Calendar, color: "text-blue-500" },
                                { label: t("optimal_rooms_used"), value: result.stats.totalRooms, icon: Clock, color: "text-purple-500" },
                            ].map((stat, i) => (
                                <Card key={i} className="rounded-3xl border-none shadow-lg bg-card/50 p-6 flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.color} bg-current/10`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                        <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Detailed Table */}
                        <Card className="rounded-[40px] border-none shadow-2xl bg-card overflow-hidden">
                            <CardHeader className="p-10 pb-6 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">{t("generated_matrix")}</CardTitle>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="rounded-lg">{result.stats.totalSubjects} {t("classes_label") || "Classes"}</Badge>
                                        <Badge variant="outline" className={`rounded-lg ${result.stats.fitness === 0 ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5"}`}>
                                            {result.stats.fitness === 0 ? t("conflict_free") : t("low_conflict")}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto min-w-full">
                                    <table className="w-full text-left border-collapse border-spacing-0">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-border/50">
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("subject_type")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("professor_label")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("room_label")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("day_label")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("time_interval")}</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t("status_label")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {result.schedule.genes.map((gene: any, i: number) => {
                                                const dayIdx = Math.floor(gene.slotId / 6);
                                                const slotIdx = gene.slotId % 6;
                                                return (
                                                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div>
                                                                <p className="font-black text-sm">{gene.subjectId.substring(0, 8)}... ({t(gene.type.toLowerCase()) || gene.type})</p>
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                                                    {gene.level} {gene.specialty ? `- ${gene.specialty}` : ""} {gene.groups && gene.groups.length > 0 ? `- ${gene.groups.join(", ")}` : ""}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                    <ArrowRight size={14} />
                                                                </div>
                                                                <span className="text-sm font-bold">{gene.professorId.substring(0, 8)}...</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase">{gene.roomId}</Badge>
                                                        </td>
                                                        <td className="px-8 py-6 font-bold text-sm uppercase">{t(DAYS[dayIdx].toLowerCase()) || DAYS[dayIdx]}</td>
                                                        <td className="px-8 py-6">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-bold font-mono">
                                                                {SLOTS[slotIdx]}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <CheckCircle2 size={18} className="mx-auto text-emerald-500" />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
