// ============================================================
// Admin Courses Dashboard — Curriculum management for Admins
// ============================================================

"use client";

import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    BookOpen,
    Pencil,
    Trash2,
    Hash,
    GraduationCap,
    Users,
    UserCheck,
    Calendar,
    MoreVertical,
    CheckCircle2,
    XCircle,
    MapPin
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CourseDialog } from "@/components/admin/course-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { toast } from "sonner";
import type { Subject } from "@/types";

import { useTranslation } from "@/lib/i18n/context";

export default function AdminCoursesPage() {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const [courses, setCourses] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Subject | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Subject | null>(null);

    useEffect(() => {
        if (!authLoading) {
            fetchCourses();
        }
    }, [authLoading, user?.studyField]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/subjects");
            const data = await res.json();
            if (res.ok) {
                setCourses(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch courses:", error);
            toast.error(t("error"));
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.studyField?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.level?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.degree?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (course: Subject) => {
        setSelectedCourse(course);
        setDialogOpen(true);
    };

    const handleDeleteClick = (course: Subject) => {
        setCourseToDelete(course);
        setDeleteDialogOpen(false); // Reset first
        setTimeout(() => setDeleteDialogOpen(true), 10);
    };

    const handleAddClick = () => {
        setSelectedCourse(null);
        setDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!courseToDelete) return;

        // Optimistic update
        setCourses(prev => prev.filter(c => c._id !== courseToDelete._id));

        try {
            const res = await fetch(`/api/admin/subjects?id=${courseToDelete._id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete course");
            }
            toast.success(t("success"));
        } catch (error: any) {
            // Revert on error
            console.error("Delete Error:", error);
            toast.error(error.message || "Deletion failed");
        } finally {
            fetchCourses();
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="space-y-8 animate-enter">
                    {/* Header Section */}
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-8 rounded-[2rem] border-none shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <BookOpen size={24} />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
                                    {t("curriculum_manager")}
                                </h1>
                            </div>
                            <p className="text-muted-foreground font-medium max-w-2xl">
                                {t("curriculum_manager_desc")}
                            </p>
                        </div>

                        <Button
                            onClick={handleAddClick}
                            className="relative z-10 rounded-2xl bg-primary text-primary-foreground h-14 px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-start"
                        >
                            <Plus className="ltr:mr-2 rtl:ml-2 h-5 w-5 text-start" />
                            {t("new_course")}
                        </Button>
                    </div>

                    {/* Main Content Area */}
                    <div className="bg-card rounded-[2rem] border-none shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
                            <div className="relative max-w-md w-full group">
                                <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <Input
                                    placeholder={t("search")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/50 border-none rounded-2xl focus:bg-background transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4 text-muted-foreground text-sm font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={16} className="text-primary" />
                                    {filteredCourses.length} {t("matches")}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto scrollbar-none">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="w-[100px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] text-start ltr:pl-8 rtl:pr-8">{t("id_course")}</TableHead>
                                        <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] text-start">{t("course_module")}</TableHead>
                                        <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] text-start">{t("faculty_group")}</TableHead>
                                        <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] text-center">{t("rooms")}</TableHead>
                                        <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] ltr:text-right rtl:text-left ltr:pr-8 rtl:pl-8">{t("last_updated")}</TableHead>
                                        <TableHead className="ltr:text-right rtl:text-left py-6 pr-8"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse border-none">
                                                <TableCell colSpan={6} className="py-8 px-6">
                                                    <div className="h-12 bg-muted rounded-2xl w-full opacity-50" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredCourses.length > 0 ? (
                                        filteredCourses.map((course) => (
                                            <TableRow key={course._id} className="group border-none hover:bg-muted/30 transition-colors rounded-3xl">
                                                <TableCell className="ltr:pl-8 rtl:pr-8 py-6">
                                                    <div className="flex flex-col items-start text-start">
                                                        <span className="text-xs font-black text-foreground uppercase tracking-tight mb-1">{course.code}</span>
                                                        <div className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary uppercase tracking-tighter">
                                                            {course.type}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-6">
                                                    <div className="flex flex-col items-start text-start">
                                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-300">{course.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
                                                            <UserCheck size={12} className="text-primary/60" />
                                                            <span className="text-[10px] font-medium tracking-tight">{(course.professor as any)?.user?.name || t("unassigned")}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-6">
                                                    <div className="flex flex-col items-start text-start gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 rounded-md bg-muted/50">
                                                                <GraduationCap size={12} className="text-zinc-400" />
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-500">{(course as any).studyField?.name || (course as any).studyField || t("common")}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 rounded-md bg-muted/50">
                                                                <Users size={12} className="text-zinc-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary ltr:mr-1 rtl:ml-1">
                                                                {course.type === "Cours" ? t("all") : (course.group || "N/A")}
                                                            </span>
                                                            <Badge variant="outline" className="text-[8px] font-bold h-4 px-1 border-primary/20 text-primary/70">{(course as any).level || "L1"}</Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-6">
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 border border-border/50 group-hover:bg-background group-hover:border-primary/20 transition-all">
                                                            <MapPin size={12} className="text-primary/60" />
                                                            <span className="text-[11px] font-black uppercase tracking-tight text-foreground">
                                                                {typeof course.scheduleInfo?.room === 'string' ? course.scheduleInfo.room : (course.scheduleInfo?.room as any)?.name || "TBA"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                            <Calendar size={10} />
                                                            <span>{course.scheduleInfo?.day}, {course.scheduleInfo?.startTime.slice(0, 5)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="ltr:pr-8 rtl:pl-8 py-6">
                                                    <div className="flex flex-col ltr:items-end rtl:items-start gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-zinc-400">
                                                                {new Date(course._updatedAt || Date.now()).toLocaleDateString()}
                                                            </span>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                                                        <MoreVertical size={16} />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[160px]">
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleEdit(course)}
                                                                        className="rounded-xl flex items-center gap-3 p-3 font-bold text-xs uppercase cursor-pointer hover:bg-primary/5 hover:text-primary transition-all ltr:justify-start rtl:justify-end"
                                                                    >
                                                                        <Pencil size={14} className="ltr:mr-2 rtl:ml-2" />
                                                                        {t("edit_details")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteClick(course)}
                                                                        className="rounded-xl flex items-center gap-3 p-3 font-bold text-xs uppercase cursor-pointer text-destructive hover:bg-destructive/5 transition-all ltr:justify-start rtl:justify-end"
                                                                    >
                                                                        <Trash2 size={14} className="ltr:mr-2 rtl:ml-2" />
                                                                        {t("delete")}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-32 text-center">
                                                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                                                    <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/30 mb-6">
                                                        <BookOpen size={40} />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">{t("no_courses_found")}</h3>
                                                    <p className="text-muted-foreground font-medium mb-8 max-sm text-center">
                                                        {searchQuery ? t("no_results") : t("register_course_desc")}
                                                    </p>
                                                    <Button
                                                        onClick={handleAddClick}
                                                        variant="outline"
                                                        className="rounded-2xl border-2 border-primary/20 text-primary font-black uppercase tracking-widest text-xs h-12 px-8 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                                                    >
                                                        {t("add_first_course")}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden p-4 space-y-4">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl" />
                                ))
                            ) : filteredCourses.length > 0 ? (
                                filteredCourses.map((course) => (
                                    <div key={course._id} className="p-6 rounded-[2rem] bg-muted/10 border border-border/50 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-foreground uppercase tracking-tight">{course.name}</span>
                                                    <Badge variant="outline" className="text-[8px] font-bold border-primary/20 text-primary bg-primary/5 uppercase">
                                                        {course.code}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <UserCheck size={14} className="text-primary/60" />
                                                    <span className="text-xs font-bold uppercase tracking-tight">{(course.professor as any)?.user?.name || t("unassigned")}</span>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-background shadow-sm">
                                                        <MoreVertical size={18} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[160px]">
                                                    <DropdownMenuItem onClick={() => handleEdit(course)} className="rounded-xl flex items-center gap-3 p-3 font-bold text-xs uppercase">
                                                        <Pencil size={14} /> {t("edit_details")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(course)} className="rounded-xl flex items-center gap-3 p-3 font-bold text-xs uppercase text-destructive">
                                                        <Trash2 size={14} /> {t("delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-2xl bg-background/50 border border-border/40 space-y-1">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <GraduationCap size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("field")}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground">{(course as any).studyField?.name || (course as any).studyField || "Common"}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-background/50 border border-border/40 space-y-1">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <Users size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("cohort")}</span>
                                                </div>
                                                <p className="text-xs font-black text-primary">{(course as any).level || "L1"} - {course.group || "G1"}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-background/50 border border-border/40 space-y-1">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <MapPin size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("location")}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground truncate">{typeof course.scheduleInfo?.room === 'string' ? course.scheduleInfo.room : (course.scheduleInfo?.room as any)?.name || "TBA"}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-background/50 border border-border/40 space-y-1">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <Calendar size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">{t("schedule")}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground">{course.scheduleInfo?.day}, {course.scheduleInfo?.startTime}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-40">
                                    <BookOpen size={40} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_results")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <CourseDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                course={selectedCourse}
                onSuccess={fetchCourses}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_course")}
                description={t("delete_course_description")}
            />
        </div>
    );
}
