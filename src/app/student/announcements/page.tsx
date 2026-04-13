"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Search, AlertCircle, Building2, Calendar, FileText } from "lucide-react";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useTranslation } from "@/lib/i18n/context";

export default function StudentAnnouncementsPage() {
    const { t, lang } = useTranslation();
    const { user } = useAuth();

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function loadData() {
            if (!user?.id) return;
            try {
                const res = await fetch("/api/student/announcements");
                if (res.ok) {
                    const data = await res.json();
                    setAnnouncements(data.announcements || []);
                }
            } catch (error) {
                console.error("Error loading student announcements:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user?.id]);

    const filteredAnnouncements = announcements.filter(a =>
        (a.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 text-start">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="animate-enter space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mb-2">
                                <Megaphone size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{t("announcements")}</span>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground">
                                {t("announcements")}
                            </h1>
                            <p className="text-muted-foreground max-w-2xl text-sm font-medium leading-relaxed">
                                {t("view_faculty_announcements") || "View important announcements and directives from your faculty and administration."}
                            </p>
                        </div>

                        {/* Search */}
                        <div className="w-full md:w-72 animate-enter [animation-delay:100ms]">
                            <div className="relative">
                                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <Input
                                    type="text"
                                    placeholder={t("search")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ltr:pl-9 rtl:pr-9 h-11 border-border bg-card shadow-sm rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="animate-enter [animation-delay:200ms]">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <StatsSkeleton />
                                <StatsSkeleton />
                                <StatsSkeleton />
                            </div>
                        ) : filteredAnnouncements.length === 0 ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                                        <AlertCircle size={40} className="text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{t("no_announcements") || "No Announcements"}</h3>
                                    <p className="text-muted-foreground max-w-md text-sm">
                                        {searchQuery
                                            ? t("no_results_found")
                                            : t("no_announcements_desc") || "There are no important announcements for your faculty or specialty at this time."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAnnouncements.map((announcement) => (
                                    <Card key={announcement._id} className="group flex flex-col rounded-2xl border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden">

                                        {/* Colored top border */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

                                        <CardHeader className="pb-3 pt-6 space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold tracking-wide gap-1.5 flex items-center shrink-0">
                                                    <Megaphone size={12} />
                                                    {announcement.targetType === "global" ? (t("global_broadcast") || "Global") : (announcement.level || t("targeted"))}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-muted-foreground tracking-widest shrink-0">
                                                    {new Date(announcement._createdAt).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                                                {announcement.title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="flex-1 pb-4 space-y-4">
                                            <p className="text-sm text-foreground/80 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                                                {announcement.description || (t("no_specific_instructions") || "No additional details provided.")}
                                            </p>

                                            {announcement.attachments && announcement.attachments.length > 0 && (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("attachments") || "Attachments"}</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {announcement.attachments.map((file: any) => (
                                                            <a
                                                                key={file._key}
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-primary/10 text-primary rounded-lg text-xs font-medium transition-colors border border-border"
                                                            >
                                                                <FileText size={14} className="text-primary" />
                                                                <span className="truncate max-w-[200px]">{file.originalFilename}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>

                                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between text-xs font-medium text-muted-foreground mt-auto">
                                            <div className="flex items-center gap-2 max-w-[70%]">
                                                <Building2 size={14} className="shrink-0 text-primary/70" />
                                                <span className="truncate">
                                                    {announcement.sender || (t("university_rectorate") || "University Administration")}
                                                </span>
                                            </div>

                                            {announcement.attachments && announcement.attachments.length > 0 && (
                                                <div className="flex items-center gap-1.5 shrink-0 bg-background border border-border px-2 py-1 rounded-md text-[10px]">
                                                    <FileText size={12} className="text-blue-500" />
                                                    <span>{announcement.attachments.length} {t("attachments") || "Files"}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
