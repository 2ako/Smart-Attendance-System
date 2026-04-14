"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Filter,
    BookOpen,
    Calendar,
    MapPin,
    Clock,
    UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CourseDialog } from "@/components/admin/course-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

export default function SubjectCatalogPage() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Dialog States
    const [courseDialogOpen, setCourseDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);

    async function loadSubjects() {
        setIsLoading(true);
        try {
            console.log("AdminSubjectsPage: Fetching subjects via API...");
            const res = await fetch("/api/subjects");
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to fetch subjects");
            }
            const data = await res.json();
            setSubjects(data.subjects || []);
        } catch (error: any) {
            console.error("Error loading subjects:", error);
            toast.error(t("failed_load_subjects") || t("error"));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!loading) {
            loadSubjects();
        }
    }, [loading, user?.studyField]);

    const handleAddCourse = () => {
        setSelectedCourse(null);
        setCourseDialogOpen(true);
    };

    const handleEditCourse = (course: any) => {
        setSelectedCourse(course);
        setCourseDialogOpen(true);
    };

    const handleDeleteClick = (course: any) => {
        setSelectedCourse(course);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCourse) return;

        // Optimistic update
        setSubjects(prev => prev.filter(s => s._id !== selectedCourse._id));

        try {
            const res = await fetch(`/api/admin/subjects?id=${selectedCourse._id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete subject");
            }
            toast.success(t("success_occurred"));
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast.error(error.message || t("error"));
        } finally {
            loadSubjects();
        }
    };

    const filteredSubjects = subjects.filter(
        (s) =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.role !== "admin") return null;

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar role={user.role} />
            <div className="flex-1 flex flex-col h-screen ltr:md:pl-72 rtl:md:pr-72 relative transition-all duration-300">
                <main className="flex-1 overflow-y-auto p-4 md:p-8 xl:p-12 pb-32 scrollbar-none scroll-smooth max-w-7xl mx-auto w-full">
                    {/* Header */}
                    <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight uppercase text-primary mb-2">
                                {t("subject_management")}
                            </h1>
                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                                <BookOpen size={16} className="text-primary/70" />
                                {t("total")}: {subjects.length} {t("courses")}
                            </p>
                        </div>
                    </header>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-5 w-5" />
                            <Input
                                placeholder={t("search")}
                                className="ltr:pl-12 rtl:pr-12 h-14 bg-card border-none shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-bold uppercase tracking-widest text-[10px] bg-card border-none shadow-sm text-foreground hover:bg-muted/50 transition-all">
                            <Filter size={16} /> {t("filter")}
                        </Button>
                        <Button
                            onClick={handleAddCourse}
                            className="h-14 px-8 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus size={18} /> {t("add_new")}
                        </Button>
                    </div>

                    {/* Subjects Table */}
                    <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 py-6 px-8">
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-primary">
                                <Calendar className="h-6 w-6 text-primary p-1 bg-primary/10 rounded-lg" />
                                {t("courses")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-8 ltr:rounded-tl-3xl rtl:rounded-tr-3xl">{t("course_title")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("level")}/{t("specialty")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("type")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("prof_name")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("scheduling_details")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground ltr:text-right rtl:text-left px-8 ltr:rounded-tr-3xl rtl:rounded-tl-3xl">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-[300px] text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                                                        <p className="font-medium animate-pulse">{t("loading")}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredSubjects.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-[300px] text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <BookOpen className="h-12 w-12 opacity-20 mb-2" />
                                                        <p className="font-bold text-lg">{t("no_specialties_desc")}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubjects.map((subject) => (
                                                <TableRow key={subject._id} className="group hover:bg-muted/40 transition-colors border-border/50">
                                                    <TableCell className="py-5 px-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
                                                                <BookOpen className="h-5 w-5 text-primary opacity-80" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                                    {subject.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground font-mono tracking-wider mt-0.5">
                                                                    {subject.code}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black px-2 py-0 h-4 border-primary/20 text-primary uppercase">
                                                                    {subject.level}
                                                                </Badge>
                                                                <span className="text-xs font-medium text-foreground/70">
                                                                    {subject.group === "All" ? t("all_groups_concerned") : `${t("group_prefix")} ${subject.group}`}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase truncate max-w-[150px]">
                                                                {subject.specialty || t("no_specialty_common_core")}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none rounded-lg px-2 py-1 font-bold tracking-widest text-[9px] uppercase">
                                                            {subject.type === "Cours" ? t("format_lecture") :
                                                                subject.type === "TD" ? t("format_tutorial") :
                                                                    subject.type === "TP" ? t("format_lab") : subject.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                                <UserCheck size={14} />
                                                            </div>
                                                            <span className="font-bold text-[11px] text-foreground/80 uppercase tracking-tight">
                                                                {subject.professor?.user?.name || t("unknown")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        {subject.scheduleInfo ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-3 text-xs font-bold text-foreground/70">
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted">
                                                                        <Calendar size={10} className="text-primary" />
                                                                        {t(subject.scheduleInfo.day.toLowerCase())}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted">
                                                                        <Clock size={10} className="text-primary" />
                                                                        {subject.scheduleInfo.startTime}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase mt-1 ltr:ml-1 rtl:mr-1">
                                                                    <MapPin size={10} />
                                                                    {subject.scheduleInfo.room}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">{t("not_available")}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-5 px-8 ltr:text-right rtl:text-left">
                                                        <div className="flex ltr:justify-end rtl:justify-start gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                                                onClick={() => handleEditCourse(subject)}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                onClick={() => handleDeleteClick(subject)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>

            <CourseDialog
                open={courseDialogOpen}
                onOpenChange={setCourseDialogOpen}
                course={selectedCourse}
                onSuccess={loadSubjects}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("remove_subject")}
                description={t("remove_subject_desc")}
            />
        </div >
    );
}
