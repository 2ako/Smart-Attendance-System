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
    Database
} from "lucide-react";

export default function AdminSchedulerPage() {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [selectedKey, setSelectedKey] = useState<string>("");
    const [viewMode, setViewMode] = useState<"visual" | "list">("visual");

    const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const SLOTS = [
        "08:00 - 09:30",
        "09:40 - 11:10",
        "11:20 - 12:50",
        "13:10 - 14:40",
        "14:50 - 16:20",
        "16:30 - 18:00",
    ];

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/scheduler/generate");
            const data = await res.json();
            if (data.success) {
                setResult(data);
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
        toast.promise(
            fetch("/api/admin/scheduler/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ genes: result.schedule.genes }),
            }),
            {
                loading: t("processing") || "Saving...",
                success: t("success_occurred") || "Saved successfully",
                error: t("error_occurred") || "Failed to save",
            }
        );
    };

    // Memoized grouping logic
    const { groupedSchedule, availableKeys } = useMemo(() => {
        if (!result?.schedule?.genes) return { groupedSchedule: {}, availableKeys: [] };
        
        const groups: Record<string, any[]> = {};
        result.schedule.genes.forEach((gene: any) => {
            const level = gene.level || "CommonCore";
            const spec = gene.specialty || "";
            const key = spec && spec !== "None" ? `${level} - ${spec}` : level;
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(gene);
        });
        
        const keys = Object.keys(groups).sort();
        return { groupedSchedule: groups, availableKeys: keys };
    }, [result]);

    // Handle initial selection and key updates
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

    const stats = [
        { label: t("performance_score") || "Score", value: result ? (100 - (result.stats.fitness / 10)).toFixed(1) + "%" : "0%", icon: Cpu, color: "text-primary" },
        { label: t("constraint_violations") || "Conflicts", value: result ? (result.stats.fitness > 1000 ? (result.stats.fitness / 1000).toFixed(0) : "0") : "0", icon: AlertTriangle, color: result?.stats.fitness > 0 ? "text-amber-500" : "text-emerald-500" },
        { label: t("scheduled_subjects") || "Subjects", value: result?.stats.totalSubjects || 0, icon: Database, color: "text-blue-500" },
        { label: t("optimal_rooms_used") || "Rooms", value: result?.stats.totalRooms || 0, icon: Clock, color: "text-purple-500" },
    ];

    return (
        <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
            <Sidebar role="admin" />
            
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-4 lg:p-8 pt-20 lg:pt-10">
                {/* Compact Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px] uppercase tracking-wider">
                            <Sparkles size={10} />
                            {t("ai_powered") || "AI Hybrid Engine"}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">{t("smart_scheduler_title") || "Smart Scheduler"}</h1>
                        <p className="text-slate-500 text-sm">{t("smart_scheduler_engine_desc") || "Automated University Timetable Optimization"}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="rounded-xl h-10 px-5 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-md shadow-primary/20"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Cpu size={14} />}
                            {isGenerating ? (t("engine_processing") || "Engine Running...") : (t("initialize_generator") || "Generate Matrix")}
                        </Button>
                        {result && (
                            <Button
                                onClick={handleCommit}
                                variant="outline"
                                className="rounded-xl h-10 px-5 font-bold uppercase text-[10px] tracking-widest gap-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all"
                            >
                                <CheckCircle2 size={14} />
                                {t("commit_schedule") || "Deploy Changes"}
                            </Button>
                        )}
                    </div>
                </div>

                {!result && !isGenerating && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { title: "Core Logic", desc: "No room or professor overlaps.", icon: Settings2, color: "text-blue-500", bg: "bg-blue-50" },
                            { title: "Heuristics", desc: "Clustered slots for student efficiency.", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50" },
                            { title: "Auto-Sync", desc: "Instant update across dashboards.", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" }
                        ].map((item, i) => (
                            <Card key={i} className="border-none shadow-sm rounded-xl overflow-hidden">
                                <CardHeader className="p-5">
                                    <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} mb-3`}>
                                        <item.icon size={20} />
                                    </div>
                                    <CardTitle className="text-sm font-bold">{item.title}</CardTitle>
                                    <CardDescription className="text-xs">{item.desc}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {result && (
                    <div className="space-y-6">
                        {/* Stats Inventory */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color} bg-current/5`}>
                                        <stat.icon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">{stat.label}</p>
                                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Control Bar - Compact */}
                        <Card className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    <select 
                                        value={selectedKey} 
                                        onChange={(e) => setSelectedKey(e.target.value)}
                                        className="h-9 px-4 rounded-lg bg-slate-50 border border-slate-200 font-bold text-[11px] focus:ring-2 focus:ring-primary outline-none w-full sm:min-w-[250px]"
                                    >
                                        <option value="ALL">
                                            {t("all_levels") || "Full Faculty Schedule"} — ({result?.schedule?.genes?.length} {t("sessions_label") || "classes total"})
                                        </option>
                                        {availableKeys.map(key => (
                                            <option key={key} value={key}>
                                                {key} ({groupedSchedule[key].length} {t("sessions_label") || "classes"})
                                            </option>
                                        ))}
                                    </select>
                                    <Badge variant="outline" className="h-9 px-4 rounded-lg font-bold uppercase text-[9px] bg-slate-50 text-slate-600 border-slate-200 shrink-0">
                                        {filteredGenes.length} {t("total_label") || "Total Sessions"}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg border border-slate-200 scroll-m-0">
                                    <Button 
                                        variant={viewMode === "visual" ? "default" : "ghost"} 
                                        onClick={() => setViewMode("visual")}
                                        className={`rounded-md h-7 px-3 font-bold uppercase text-[9px] ${viewMode === "visual" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}
                                    >
                                        {t("visual_view") || "Visual"}
                                    </Button>
                                    <Button 
                                        variant={viewMode === "list" ? "default" : "ghost"} 
                                        onClick={() => setViewMode("list")}
                                        className={`rounded-md h-7 px-3 font-bold uppercase text-[9px] ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}
                                    >
                                        {t("list_view") || "List"}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {viewMode === "visual" ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full border-separate border-spacing-1.5 min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="p-2 bg-slate-50 rounded-lg w-20"></th>
                                            {DAYS.map(day => (
                                                <th key={day} className="p-3 bg-slate-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                                                    {t(day.toLowerCase()) || day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SLOTS.map((time, slotIdx) => (
                                            <tr key={slotIdx}>
                                                <td className="p-2 bg-slate-50/50 rounded-lg text-center border border-slate-100">
                                                    <span className="font-mono text-[9px] font-bold text-slate-400">{time.split(' - ')[0]}</span>
                                                </td>
                                                {DAYS.map((day, dayIdx) => {
                                                    const slotId = dayIdx * 6 + slotIdx;
                                                    const genesAtSlot = filteredGenes.filter((g: any) => g.slotId === slotId);
                                                    
                                                    return (
                                                        <td key={`${day}-${slotIdx}`} className="p-0 align-top min-w-[150px]">
                                                            <div className="flex flex-col gap-1.5">
                                                                {genesAtSlot.map((gene: any, idx: number) => (
                                                                    <div key={idx} className={`p-3 rounded-xl border group relative transition-all hover:ring-2 hover:ring-primary/20 ${
                                                                        gene.type === "Cours" ? "bg-blue-50 border-blue-100" : 
                                                                        gene.type === "TD" ? "bg-amber-50 border-amber-100" : 
                                                                        "bg-emerald-50 border-emerald-100"
                                                                    }`}>
                                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                            <Badge className={`rounded px-1.5 py-0 text-[8px] font-black uppercase border-none ${
                                                                                gene.type === "Cours" ? "bg-blue-500 text-white" : 
                                                                                gene.type === "TD" ? "bg-amber-500 text-white" : 
                                                                                "bg-emerald-500 text-white"
                                                                            }`}>
                                                                                {gene.type}
                                                                            </Badge>
                                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                                {gene.roomId}
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-[11px] font-bold leading-tight mb-1 truncate text-slate-800">
                                                                            {gene.subjectName}
                                                                        </h4>
                                                                        <p className="text-[9px] text-slate-500 font-medium truncate mb-2">
                                                                            Pr. {gene.professorName}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(gene.groups || []).map((g: string) => (
                                                                                <span key={g} className="px-1.5 py-0.5 bg-white/50 text-[8px] font-bold text-slate-600 rounded border border-slate-200 lowercase tracking-tighter">{g}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {genesAtSlot.length === 0 && (
                                                                    <div className="h-12 w-full rounded-xl border border-dashed border-slate-100" />
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
                            <Card className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-lg font-bold">Session Inventory</h3>
                                    <p className="text-slate-500 text-xs">Tracing {filteredGenes.length} discrete genes for {selectedKey}</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/50 text-slate-500 uppercase tracking-widest font-black">
                                                <th className="px-6 py-4">Subject</th>
                                                <th className="px-6 py-4">Professor</th>
                                                <th className="px-6 py-4">Room</th>
                                                <th className="px-6 py-4">Slot</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredGenes.map((gene: any, i: number) => {
                                                const dayIdx = Math.floor(gene.slotId / 6);
                                                const slotIdx = gene.slotId % 6;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-3 font-bold">
                                                            <div>{gene.subjectName}</div>
                                                            <div className="text-[9px] text-slate-400 font-normal">{gene.type}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-600 font-medium">{gene.professorName}</td>
                                                        <td className="px-6 py-3"><Badge variant="secondary" className="rounded-md font-bold text-[10px]">{gene.roomId}</Badge></td>
                                                        <td className="px-6 py-3 text-slate-500 font-mono text-[10px] uppercase">
                                                            {DAYS[dayIdx]} {SLOTS[slotIdx].split(' - ')[0]}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                        
                        {/* Status Bar */}
                        <div className="pt-10 flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><Database size={8}/> Registry: {result.stats.totalSubjects} </span>
                                <span className="flex items-center gap-1"><Cpu size={8}/> Gene Pool: {result.schedule.genes.length} </span>
                            </div>
                            <span>Active Node: {selectedKey}</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
