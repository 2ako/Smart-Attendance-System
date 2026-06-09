"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, CalendarDays, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface TimetableEntry {
    _id: string;
    day: string;
    startTime: string;
    endTime: string;
    subject: {
        name: string;
        code: string;
        type: string;
    };
    professor?: {
        user?: {
            name: string;
        };
    };
    room?: {
        name: string;
    } | string;
    group?: string;
    groups?: string[];
}

const DAYS_OF_WEEK = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TIME_SLOTS = [
    { start: "08:00", end: "09:30" },
    { start: "09:30", end: "11:00" },
    { start: "11:00", end: "12:30" },
    { start: "12:30", end: "14:00" },
    { start: "14:00", end: "15:30" },
    { start: "15:30", end: "17:00" },
];

export function TimetableView() {
    const { t, lang } = useTranslation();
    const [schedules, setSchedules] = useState<TimetableEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMySchedules = async () => {
            try {
                const res = await fetch("/api/schedules/mine");
                if (res.ok) {
                    const data = await res.json();
                    setSchedules(data.schedules || []);
                }
            } catch (error) {
                console.error("Error fetching schedules:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMySchedules();
    }, []);

    const getEntryForSlot = (day: string, slotStart: string) => {
        return schedules.find(s => s.day === day && s.startTime === slotStart);
    };

    const getTypeColor = (type: string) => {
        const t = type?.toLowerCase();
        if (t === "cours" || t === "lecture") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
        if (t === "td") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
        if (t === "tp") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 text-start">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">{t("loading")}</p>
            </div>
        );
    }

    return (
        <div className="animate-enter text-start">
            <div className="mb-6 flex items-center justify-between text-start">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground text-start">{t("weekly_timetable")}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 text-start">{t("academic_archives")}</p>
                </div>
                <div className="flex items-center gap-4 text-start">
                    <div className="flex items-center gap-2 text-start">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("format_lecture")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-start">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("format_td")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-start">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("format_tp")}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 bg-card/30 p-2 rounded-[2.5rem] border border-border/50 text-start">
                {/* Time column (hidden on mobile, maybe?) */}
                <div className="hidden md:flex flex-col gap-4 text-start">
                    <div className="h-14 flex items-center justify-center text-start">
                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                            <Clock size={18} />
                        </div>
                    </div>
                    {TIME_SLOTS.map(slot => (
                        <div key={slot.start} className="h-32 flex flex-col items-center justify-center space-y-1 bg-muted/20 rounded-3xl border border-border/30 text-start">
                            <span className="text-[10px] font-black text-foreground">{slot.start}</span>
                            <div className="h-4 w-px bg-border" />
                            <span className="text-[10px] font-black text-muted-foreground/60">{slot.end}</span>
                        </div>
                    ))}
                </div>

                {/* Days columns */}
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="flex flex-col gap-4 text-start">
                        <div className="h-14 flex flex-col items-center justify-center bg-primary/5 rounded-2xl border border-primary/10 text-start">
                            <span className="text-xs font-black uppercase tracking-widest text-primary">{t(day.toLowerCase())}</span>
                        </div>
                        {TIME_SLOTS.map(slot => {
                            const entry = getEntryForSlot(day, slot.start);
                            return (
                                <div key={`${day}-${slot.start}`} className="h-32 relative group text-start">
                                    {entry ? (
                                        <div className={cn(
                                            "absolute inset-0 rounded-[2rem] p-4 flex flex-col justify-between border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5",
                                            getTypeColor(entry.subject?.type)
                                        )}>
                                            <div className="text-start">
                                                <div className="flex items-center justify-between mb-1 text-start">
                                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">{entry.subject?.code}</span>
                                                    <Badge variant="outline" className="text-[8px] h-4 px-1 border-current opacity-60 font-black uppercase">
                                                        {t(`format_${(entry.subject?.type || "lecture").toLowerCase()}`)}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] font-black leading-tight uppercase line-clamp-2 text-start">{entry.subject?.name}</p>
                                            </div>
                                            
                                            <div className="space-y-1.5 text-start">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-70 text-start">
                                                    <MapPin size={10} />
                                                    <span className="truncate">{typeof entry.room === 'string' ? entry.room : entry.room?.name || '---'}</span>
                                                </div>
                                                {entry.professor?.user?.name && (
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-70 text-start">
                                                        <User size={10} />
                                                        <span className="truncate">{entry.professor.user.name.split(" ")[0]}</span>
                                                    </div>
                                                )}
                                                {entry.group && (
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-start">
                                                        <CalendarDays size={10} />
                                                        <span className="truncate uppercase">{t("group_prefix")} {entry.group}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 rounded-[2rem] border border-dashed border-border/40 bg-muted/5 group-hover:bg-muted/10 transition-colors flex items-center justify-center text-start">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors">{t("no_classes_scheduled")}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
