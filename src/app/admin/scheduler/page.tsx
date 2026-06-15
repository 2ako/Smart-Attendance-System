"use client";

import { useState, useMemo, useEffect } from "react";
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
    Loader2,
    Database,
    Pencil
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminSchedulerPage() {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [selectedKey, setSelectedKey] = useState<string>("");
    const [viewMode, setViewMode] = useState<"visual" | "list">("visual");
    const [isGenerated, setIsGenerated] = useState(false);

    // Manual Edit States
    const [editingGene, setEditingGene] = useState<{ gene: any, index: number } | null>(null);
    const [isUpdatingStats, setIsUpdatingStats] = useState(false);

    // Auto-load committed schedule on mount
    useEffect(() => {
        const loadExisting = async () => {
            try {
                const res = await fetch("/api/admin/scheduler/load");
                const data = await res.json();
                if (data.success && data.hasSchedule) {
                    setResult(data);
                    setIsGenerated(false); // Stats hidden on load
                }
            } catch (e) {
                // silently fail – admin can generate a new one
            } finally {
                setIsLoadingExisting(false);
            }
        };
        loadExisting();
    }, []);

    // Smart Availability Helper
    const getConflictReason = (slotId: number, roomId: string, gene: any, allGenes: any[]) => {
        const potentialConflicts: string[] = [];

        allGenes.forEach((g: any, i: number) => {
            if (i === editingGene?.index) return;
            if (g.slotId !== slotId) return;

            // 1. Room
            if (g.roomId === roomId && roomId !== "IGNORE_ROOM_FOR_NOW") {
                potentialConflicts.push(`${t("room_occupied")} ${g.subjectName}`);
            }

            // 2. Professor
            if (g.professorId === gene.professorId) {
                potentialConflicts.push(`${t("professor_busy")} ${g.subjectName}`);
            }

            // 3. Group (Hierarchical)
            const isSameLevel = g.level === gene.level;
            if (isSameLevel) {
                const gSpec = g.specialty || "None";
                const geneSpec = gene.specialty || "None";
                const isEitherCommon = gSpec === "None" || geneSpec === "None";
                const isSameSpec = gSpec === geneSpec;

                if (isEitherCommon || isSameSpec) {
                    const gGroups = g.groups || [];
                    const geneGroups = gene.groups || [];
                    const gHasAll = gGroups.includes("All");
                    const geneHasAll = geneGroups.includes("All");

                    if ((gHasAll && geneGroups.length > 0) || (geneHasAll && gGroups.length > 0)) {
                        potentialConflicts.push(`${t("group_overlap")} ${g.subjectName}`);
                    } else {
                        const overlap = gGroups.filter((gr: string) => geneGroups.includes(gr));
                        if (overlap.length > 0) {
                            potentialConflicts.push(`${t("group_busy")} ${g.subjectName}`);
                        }
                    }
                }
            }
        });

        return potentialConflicts.length > 0 ? potentialConflicts[0] : null;
    };

    const DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"];
    const SLOTS = [
        "08:00 - 09:30",
        "09:30 - 11:00",
        "11:00 - 12:30",
        "12:30 - 14:00",
        "14:00 - 15:30",
        "15:30 - 17:00",
    ];

    const handleGeneUpdate = async (newGene: any, index: number) => {
        if (!result) return;

        const newGenes = [...result.schedule.genes];
        newGenes[index] = newGene;

        setIsUpdatingStats(true);
        try {
            const res = await fetch("/api/admin/scheduler/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ genes: newGenes }),
            });
            const data = await res.json();

            if (data.success) {
                setResult({
                    ...result,
                    schedule: { ...result.schedule, genes: newGenes },
                    stats: { ...result.stats, ...data.stats },
                    conflicts: data.conflicts
                });
                toast.success(t("success_occurred") || "Manual change applied");
            }
        } catch (error) {
            toast.error(t("error_occurred") || "Failed to re-evaluate schedule");
        } finally {
            setIsUpdatingStats(false);
            setEditingGene(null);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/scheduler/generate");
            const data = await res.json();
            if (data.success) {
                setResult(data);
                setIsGenerated(true); // Stats shown after generation
                toast.success(t("success_occurred") || "Schedule generated successfully");
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
        const toastId = toast.loading(t("processing") || "Saving schedule...");
        try {
            const res = await fetch("/api/admin/scheduler/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    genes: result.schedule.genes,
                    stats: result.stats,
                    conflicts: result.schedule.conflicts
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || `Server error (${res.status})`);
            }

            // If the server returns updated stats/metadata, sync the local state
            if (data.stats) {
                setResult((prev: any) => ({
                    ...prev,
                    stats: data.stats
                }));
            }
            
            setIsGenerated(false); // Transitions into "committed/loaded" mode

            toast.success(`${t("success_occurred") || "Saved"} — ${data.count} sessions`, { id: toastId });
        } catch (error: any) {
            toast.error(`${t("error_occurred") || "Failed to save"}: ${error.message}`, { id: toastId });
        }
    };


    const { groupedSchedule, availableKeys } = useMemo(() => {
        if (!result?.schedule?.genes) return { groupedSchedule: {}, availableKeys: [] };

        const groups: Record<string, any[]> = {};
        result.schedule.genes.forEach((gene: any) => {
            const level = gene.levelName || gene.level || "CommonCore";
            const spec = gene.specialtyName || gene.specialty || "";
            const key = spec && spec !== "None" ? `${level} - ${spec}` : level;

            if (!groups[key]) groups[key] = [];
            groups[key].push(gene);
        });

        const keys = Object.keys(groups).sort();
        return { groupedSchedule: groups, availableKeys: keys };
    }, [result]);

    useEffect(() => {
        if (availableKeys.length > 0) {
            if (!selectedKey || !availableKeys.includes(selectedKey)) {
                setSelectedKey(availableKeys[0]);
            }
        }
    }, [availableKeys, selectedKey]);

    const filteredGenes = useMemo(() => {
        if (selectedKey === "ALL") return result?.schedule?.genes || [];
        return (selectedKey && groupedSchedule[selectedKey]) ? groupedSchedule[selectedKey] : [];
    }, [selectedKey, groupedSchedule, result]);

    const statsEntries = [
        {
            label: t("hard_conflicts"),
            value: result?.stats?.hardConflicts - 180 || 0,
            icon: AlertTriangle,
            color: (result?.stats?.hardConflicts - 180 || 0) > 0 ? "text-red-500 font-bold" : "text-emerald-500"
        },
        {
            label: t("soft_conflicts"),
            value: result?.stats?.softConflicts - 100 || 0,
            icon: Clock,
            color: "text-amber-500"
        },
        { label: t("saturday_slots"), value: result?.stats?.saturdaySlots ?? 0, icon: Database, color: "text-blue-500" },
        {
            label: t("performance_score"),
            value: result ? (() => {
                const total = result.schedule?.genes?.length || 1;
                const hard = result.stats?.hardConflicts - 180 || 0;
                const hPenalty = (hard / total) * 100;
                const sPenalty = (result.stats?.saturdaySlots ?? 0) * 0.1;
                const prefPenalty = Math.min(5, (result.stats?.softConflicts - 100 || 0) * 0.05);
                return Math.max(0, 100 - hPenalty - sPenalty - prefPenalty).toFixed(1) + "%";
            })() : "0%",
            icon: Cpu,
            color: "text-purple-500"
        },
    ];

    return (
        <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 overflow-y-auto flex flex-col p-4 lg:p-8 pt-20 lg:pt-10 transition-all duration-300 custom-scrollbar">
                {/* Header Section */}
                <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 backdrop-blur-md">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 font-bold text-[10px] uppercase tracking-wider">
                            <Sparkles size={10} />
                            {t("ai_powered")}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">{t("smart_scheduler_title")}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{t("smart_scheduler_engine_desc")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="rounded-xl h-10 px-5 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-md shadow-primary/20 dark:shadow-none"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Cpu size={14} />}
                            {isGenerating ? t("engine_processing") : t("initialize_generator")}
                        </Button>
                        {result && isGenerated && (
                            <Button
                                onClick={handleCommit}
                                variant="outline"
                                className="rounded-xl h-10 px-5 font-bold uppercase text-[10px] tracking-widest gap-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white transition-all"
                            >
                                <CheckCircle2 size={14} />
                                {t("commit_schedule")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Loading existing schedule */}
                {isLoadingExisting && !isGenerating && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 size={40} className="animate-spin text-primary" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t("processing") || "Loading schedule..."}</p>
                    </div>
                )}

                {!result && !isGenerating && !isLoadingExisting && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {[
                            { title: t("core_logic"), desc: t("core_logic_desc"), icon: Settings2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
                            { title: t("heuristics"), desc: t("heuristics_desc"), icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
                            { title: t("auto_sync"), desc: t("auto_sync_desc"), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" }
                        ].map((item, i) => (
                            <Card key={i} className="border-none shadow-sm rounded-xl overflow-hidden dark:bg-slate-900/40">
                                <CardHeader className="p-5">
                                    <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} mb-3`}>
                                        <item.icon size={20} />
                                    </div>
                                    <CardTitle className="text-sm font-bold">{item.title}</CardTitle>
                                    <CardDescription className="text-xs dark:text-slate-400">{item.desc}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {result && (
                    <div className="flex-1 flex flex-col min-h-0 space-y-6">
                        {/* Stats Inventory - Only show when freshly generated */}
                        {isGenerated && (
                            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                {statsEntries.map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 transition-all">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color} bg-current/5`}>
                                            <stat.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-0.5 tracking-tighter">{stat.label}</p>
                                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Control Bar */}
                        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select
                                    value={selectedKey}
                                    onChange={(e) => setSelectedKey(e.target.value)}
                                    className="h-9 px-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[11px] focus:ring-2 focus:ring-primary outline-none w-full sm:min-w-[280px] dark:text-slate-300"
                                >
                                    <option value="ALL">
                                        {t("full_faculty_schedule")} — ({result?.schedule?.genes?.length} {t("sessions_label")})
                                    </option>
                                    {availableKeys.map(key => (
                                        <option key={key} value={key}>
                                            {key} ({groupedSchedule[key].length} {t("sessions_label")})
                                        </option>
                                    ))}
                                </select>
                                <Badge variant="outline" className="hidden sm:inline-flex h-9 px-4 rounded-lg font-bold uppercase text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 shrink-0">
                                    {filteredGenes.length} {t("total_label")}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <Button
                                    variant={viewMode === "visual" ? "default" : "ghost"}
                                    onClick={() => setViewMode("visual")}
                                    className={`rounded-md h-7 px-4 font-bold uppercase text-[9px] ${viewMode === "visual" ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600"}`}
                                >
                                    {t("visual_view")}
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "default" : "ghost"}
                                    onClick={() => setViewMode("list")}
                                    className={`rounded-md h-7 px-4 font-bold uppercase text-[9px] ${viewMode === "list" ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600"}`}
                                >
                                    {t("list_view")}
                                </Button>
                            </div>
                        </div>

                        {/* Content Area - Natural Expansion */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col">
                            {viewMode === "visual" ? (
                                <div className="p-4 overflow-x-auto custom-scrollbar pb-20">
                                    <table className="w-full border-separate border-spacing-2 min-w-[1200px]">
                                        <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900">
                                            <tr>
                                                <th className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl w-24"></th>
                                                {DAYS.map(day => (
                                                    <th key={day} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                                        {t(day)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="mt-2">
                                            {SLOTS.map((time, slotIdx) => (
                                                <tr key={slotIdx}>
                                                    <td className="p-3 bg-slate-50/30 dark:bg-slate-800/20 rounded-xl text-center border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-1 min-h-[90px]">
                                                        <Clock size={12} className="mx-auto text-slate-300" />
                                                        <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">{time.split(' - ')[0]}</span>
                                                    </td>
                                                    {DAYS.map((day, dayIdx) => {
                                                        const slotId = dayIdx * 6 + slotIdx;
                                                        const genesAtSlot = filteredGenes.filter((g: any) => g.slotId === slotId);

                                                        return (
                                                            <td key={`${day}-${slotIdx}`} className="p-0 align-top min-w-[180px]">
                                                                <div className="flex flex-col gap-2">
                                                                    {genesAtSlot.map((gene: any, idx: number) => {
                                                                        const realIndex = result.schedule.genes.findIndex((g: any) => g === gene);
                                                                        const hasConflict = (result.conflicts || []).some((c: string) => c.includes(gene.subjectName) && c.includes(`slot ${gene.slotId}`));

                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                onClick={() => setEditingGene({ gene, index: realIndex })}
                                                                                className={`p-4 rounded-2xl border-2 group relative transition-all active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-md ${gene.type === "Cours" ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/20 hover:bg-white dark:hover:bg-blue-900/20" :
                                                                                    gene.type === "TD" ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100/50 dark:border-amber-900/20 hover:bg-white dark:hover:bg-amber-900/20" :
                                                                                        "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/20 hover:bg-white dark:hover:bg-emerald-900/20"
                                                                                    }`}
                                                                            >
                                                                                {hasConflict && (
                                                                                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-pulse">
                                                                                        <AlertTriangle size={8} className="text-white" />
                                                                                    </div>
                                                                                )}

                                                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                                                    <Badge className={`rounded-lg px-2 py-0.5 text-[8px] font-black uppercase border-none tracking-tighter ${gene.type === "Cours" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" :
                                                                                        gene.type === "TD" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" :
                                                                                            "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                                                                        }`}>
                                                                                        {gene.type}
                                                                                    </Badge>
                                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/60 dark:bg-black/20 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                                                                                        <Database size={8} className="text-slate-400" />
                                                                                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">
                                                                                            {gene.roomId}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <h4 className="text-[12px] font-bold leading-tight mb-1 line-clamp-2 text-slate-800 dark:text-slate-200">
                                                                                    {gene.subjectName}
                                                                                </h4>
                                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mb-2">
                                                                                    {gene.professorName}
                                                                                </p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {(gene.groups || []).map((g: string) => (
                                                                                        <span key={g} className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[8px] font-bold text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 lowercase">{g}</span>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <Pencil size={10} className="text-primary" />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {genesAtSlot.length === 0 && (
                                                                        <div className="h-20 w-full rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/5 transition-colors hover:border-slate-200 dark:hover:border-slate-800" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar pb-20">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black border-b border-slate-200 dark:border-slate-800">
                                                <th className="px-6 py-5">{t("subject") || "Subject"}</th>
                                                <th className="px-6 py-5">{t("professor") || "Professor"}</th>
                                                <th className="px-6 py-5">{t("room") || "Room"}</th>
                                                <th className="px-6 py-5">{t("day_label") || "Day"} & {t("time_label") || "Time"}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredGenes.map((gene: any, i: number) => {
                                                const dayIdx = Math.floor(gene.slotId / 6);
                                                const slotIdx = gene.slotId % 6;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">{gene.subjectName}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{gene.type}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{gene.professorName}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="outline" className="rounded-lg font-bold text-[10px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                                                {gene.roomId}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">{t(DAYS[dayIdx])}</span>
                                                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                                                <span className="font-mono text-[10px] text-primary">{SLOTS[slotIdx].split(' - ')[0]}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Footer Status Bar */}
                            <div className="shrink-0 bg-slate-50 dark:bg-slate-800/30 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                                <div className="flex items-center gap-6">
                                    <span className="flex items-center gap-1.5"><Database size={10} className="text-blue-500/50" /> {t("registry")}: {result?.stats?.totalSubjects || 0} </span>
                                    <span className="flex items-center gap-1.5"><Cpu size={10} className="text-purple-500/50" /> {t("gene_pool")}: {result?.schedule?.genes?.length || 0} </span>
                                </div>
                                <span className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {t("active_node")}: {selectedKey === "ALL" ? t("all_levels") : selectedKey}
                                </span>
                            </div>
                        </div>

                        {/* Edit Modal (Dialog) */}
                        <Dialog open={!!editingGene} onOpenChange={(open) => !open && setEditingGene(null)}>
                            <DialogContent className="sm:max-w-[420px] rounded-[2rem] p-8 border-none shadow-2xl dark:bg-slate-900">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                            <Pencil size={20} />
                                        </div>
                                        {t("modify_session")}
                                    </DialogTitle>
                                </DialogHeader>

                                {editingGene && (
                                    <div className="space-y-6 py-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                                <Sparkles size={40} />
                                            </div>
                                            <p className="font-black text-base text-slate-800 dark:text-slate-100 truncate mb-1">{editingGene.gene.subjectName}</p>
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black rounded-lg">{editingGene.gene.type}</Badge>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{editingGene.gene.professorName}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t("day_label")}</Label>
                                                <Select
                                                    value={Math.floor(editingGene.gene.slotId / 6).toString()}
                                                    onValueChange={(val) => {
                                                        const newDay = parseInt(val);
                                                        const slotIdx = editingGene.gene.slotId % 6;
                                                        setEditingGene({ ...editingGene, gene: { ...editingGene.gene, slotId: newDay * 6 + slotIdx } });
                                                    }}
                                                >
                                                    <SelectTrigger className="rounded-xl h-[52px] font-bold text-sm bg-slate-50 dark:bg-slate-800 border-none shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-2xl">
                                                        {DAYS.map((day, i) => (
                                                            <SelectItem key={i} value={i.toString()} className="font-bold text-xs uppercase tracking-wider py-3">
                                                                {t(day)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t("time_label")}</Label>
                                                <Select
                                                    value={(editingGene.gene.slotId % 6).toString()}
                                                    onValueChange={(val) => {
                                                        const newSlotCode = parseInt(val);
                                                        const dayIdx = Math.floor(editingGene.gene.slotId / 6);
                                                        setEditingGene({ ...editingGene, gene: { ...editingGene.gene, slotId: dayIdx * 6 + newSlotCode } });
                                                    }}
                                                >
                                                    <SelectTrigger className="rounded-xl h-[52px] font-bold text-sm bg-slate-50 dark:bg-slate-800 border-none shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-2xl">
                                                        {SLOTS.map((time, i) => {
                                                            const dayIdx = Math.floor(editingGene.gene.slotId / 6);
                                                            const testSlot = dayIdx * 6 + i;
                                                            const reason = getConflictReason(testSlot, "IGNORE_ROOM_FOR_NOW", editingGene.gene, result.schedule.genes);
                                                            const isBusy = reason && (reason.includes("Professor") || reason.includes("Group") || reason.includes("الأستاذ") || reason.includes("الفوج"));

                                                            if (isBusy) return null;

                                                            return (
                                                                <SelectItem key={i} value={i.toString()} className="font-mono text-xs font-black py-3">
                                                                    {time.split(' - ')[0]}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{t("rooms")}</Label>
                                            <Select
                                                value={editingGene.gene.roomId}
                                                onValueChange={(val) => setEditingGene({ ...editingGene, gene: { ...editingGene.gene, roomId: val } })}
                                            >
                                                <SelectTrigger className="rounded-xl h-[52px] font-bold text-sm bg-slate-50 dark:bg-slate-800 border-none shadow-inner">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-2xl max-h-[220px]">
                                                    {(result.infrastructure?.rooms || []).map((r: any) => {
                                                        const reason = getConflictReason(editingGene.gene.slotId, r.name, editingGene.gene, result.schedule.genes);
                                                        if (reason && (reason.includes("Room") || reason.includes("القاعة"))) return null;

                                                        return (
                                                            <SelectItem key={r.name} value={r.name} className="font-black text-xs py-3">{r.name}</SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Dynamic Status Indicator */}
                                        {(() => {
                                            const finalReason = getConflictReason(editingGene.gene.slotId, editingGene.gene.roomId, editingGene.gene, result.schedule.genes);
                                            return finalReason ? (
                                                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl animate-in zoom-in-95">
                                                    <div className="h-6 w-6 bg-red-500 rounded-lg flex items-center justify-center shrink-0">
                                                        <AlertTriangle size={14} className="text-white" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">{finalReason}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl animate-in zoom-in-95">
                                                    <div className="h-6 w-6 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                                        <CheckCircle2 size={14} className="text-white" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{t("slot_available")}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <DialogFooter className="gap-3 sm:gap-0 mt-6">
                                    <Button variant="ghost" onClick={() => setEditingGene(null)} className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        disabled={isUpdatingStats}
                                        onClick={() => handleGeneUpdate(editingGene?.gene, editingGene!.index)}
                                        className="flex-[2] rounded-2xl h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20"
                                    >
                                        {isUpdatingStats ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} className="mr-2" />}
                                        {t("save_changes")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* Loading State Overlay */}
                {isGenerating && (
                    <div className="fixed inset-0 z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-center flex-col gap-6">
                        <div className="relative">
                            <div className="h-24 w-24 border-4 border-primary/20 rounded-full animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Cpu size={40} className="text-primary animate-bounce" />
                            </div>
                            <div className="absolute inset-0 h-24 w-24 border-t-4 border-primary rounded-full animate-spin" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t("engine_processing")}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t("engine_run_desc")}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
