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
    Users,
    GraduationCap,
    LayoutGrid,
    BookOpen,
    Layers,
    ChevronRight,
    SearchX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentDialog } from "@/components/admin/student-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { useTranslation } from "@/lib/i18n/context";

export default function AdminStudentsPage() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("all");
    const [studyFieldFilter, setStudyFieldFilter] = useState("all");
    const [specialtyFilter, setSpecialtyFilter] = useState("all");
    const [groupFilter, setGroupFilter] = useState("all");

    // Dialog States
    const [studentDialogOpen, setStudentDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    async function loadStudents() {
        if (!user && loading) return;
        setIsLoading(true);
        try {
            const sfCode = user?.studyField || "";
            console.log("AdminStudentsPage: Loading students for studyField:", sfCode);

            // Attempt to resolve the ID if it looks like a code
            const queryParams = new URLSearchParams({
                studyField: studyFieldFilter,
                level: selectedLevel,
                specialty: specialtyFilter,
                group: groupFilter
            });

            console.log("AdminStudentsPage: Fetching students via API:", queryParams.toString());
            const res = await fetch(`/api/students?${queryParams.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to fetch students");
            }

            const data = await res.json();
            setStudents(data.students || []);
        } catch (error: any) {
            console.error("AdminStudentsPage error:", error);
            toast.error(t("failed_load_students"));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!loading) {
            loadStudents();
        }
    }, [loading, user?.studyField]);

    const handleAddStudent = () => {
        setSelectedStudent(null);
        setStudentDialogOpen(true);
    };

    const handleEditStudent = (student: any) => {
        setSelectedStudent(student);
        setStudentDialogOpen(true);
    };

    const handleDeleteClick = (student: any) => {
        setSelectedStudent(student);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedStudent) return;
        try {
            const res = await fetch(`/api/students?id=${selectedStudent._id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success(t("success"));
                loadStudents();
            } else {
                throw new Error("Deletion failed");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    const studyFields = Array.from(new Set(students.filter(s => s.studyField).map(s => s.studyField))).sort();
    const specialties = Array.from(new Set(students.filter(s => s.specialty).map(s => s.specialty))).sort();
    const groups = Array.from(new Set(students.filter(s => s.group).map(s => s.group))).sort();
    const levels = ["L1", "L2", "L3", "M1", "M2"];

    const filteredStudents = students.filter(s => {
        const matchesSearch =
            (s.fullName || s.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.matricule || "").includes(searchTerm);

        const matchesLevel = selectedLevel === "all" || s.level === selectedLevel;
        const matchesField = studyFieldFilter === "all" || s.studyField === studyFieldFilter;
        const matchesSpecialty = specialtyFilter === "all" || s.specialty === specialtyFilter;
        const matchesGroup = groupFilter === "all" || s.group === groupFilter;

        return matchesSearch && matchesLevel && matchesField && matchesSpecialty && matchesGroup;
    });

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <GraduationCap size={12} />
                            {t("academic_registry")}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">{t("student_management")}</h1>
                            <p className="text-muted-foreground font-medium max-w-2xl">
                                {t("student_body_desc")}
                            </p>
                        </div>
                        <Button onClick={handleAddStudent} className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-14 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.05] active:scale-[0.95] gap-2 text-start">
                            <Plus size={18} strokeWidth={3} />
                            {t("enroll_new")}
                        </Button>
                    </div>
                </div>

                {/* ── Filtering Tools ────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 animate-enter [animation-delay:100ms]">
                    <div className="md:col-span-1 relative group">
                        <Search size={18} className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t("search")}
                            className="h-14 ltr:pl-12 rtl:pr-12 bg-card border-none shadow-sm rounded-2xl text-foreground focus-visible:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Select value={studyFieldFilter} onValueChange={setStudyFieldFilter}>
                        <SelectTrigger className="h-14 rounded-2xl bg-card border-none shadow-sm font-bold uppercase tracking-widest text-[10px]">
                            <SelectValue placeholder={t("field")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">{t("all_fields")}</SelectItem>
                            {studyFields.map(field => (
                                <SelectItem key={field} value={field} className="font-bold uppercase tracking-widest text-[10px]">{field}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                        <SelectTrigger className="h-14 rounded-2xl bg-card border-none shadow-sm font-bold uppercase tracking-widest text-[10px]">
                            <SelectValue placeholder={t("specialty")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">{t("all_specialties")}</SelectItem>
                            {specialties.map(spec => (
                                <SelectItem key={spec} value={spec} className="font-bold uppercase tracking-widest text-[10px]">{spec}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                        <SelectTrigger className="h-14 rounded-2xl bg-card border-none shadow-sm font-bold uppercase tracking-widest text-[10px]">
                            <SelectValue placeholder={t("group")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">{t("all_groups")}</SelectItem>
                            {groups.map(g => (
                                <SelectItem key={g} value={g} className="font-bold uppercase tracking-widest text-[10px]">{t("group")} {g}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* ── Organized View ─────────────────────────────────── */}
                <Tabs defaultValue="all" className="w-full animate-enter [animation-delay:200ms]" onValueChange={setSelectedLevel}>
                    <TabsList className="bg-card p-1.5 rounded-[24px] mb-8 h-16 shadow-sm border border-border/50 max-w-3xl overflow-x-auto">
                        <TabsTrigger value="all" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] h-full transition-all">{t("all_students")}</TabsTrigger>
                        {levels.map(level => (
                            <TabsTrigger key={level} value={level} className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] h-full transition-all">{level}</TabsTrigger>
                        ))}
                    </TabsList>

                    <Card className="rounded-[40px] border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden border border-white/10">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("student_info")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-center">{t("field")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-center">{t("specialty")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-center">{t("group")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-center">{t("level")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest ltr:text-right rtl:text-left">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={6} className="py-10 border-border/10">
                                                <div className="h-12 bg-muted/20 rounded-2xl mx-4" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-20">
                                                <SearchX size={64} className="mb-4" />
                                                <p className="text-xl font-bold uppercase tracking-tight">{t("no_students_found")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <TableRow key={student._id} className="hover:bg-muted/20 border-border/50 transition-all group">
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                                                        {student.fullName?.[0] || student.user?.name?.[0] || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                                                            {student.fullName || student.user?.name}
                                                        </p>
                                                        <p className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                                                            {student.matricule}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-none font-bold text-[9px] uppercase tracking-widest h-7 px-3 rounded-lg text-center mx-auto block w-fit">
                                                    {student.studyField || t("not_available")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground border-none font-bold text-[9px] uppercase tracking-widest h-7 px-3 rounded-lg text-center mx-auto block w-fit">
                                                    {student.specialty || t("general")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-6 px-8 text-center">
                                                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 font-mono font-black text-xs border border-orange-500/20 shadow-sm">
                                                    {student.group || "1"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8 text-center">
                                                <div className="inline-flex h-9 px-4 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-black text-[10px] uppercase tracking-widest border border-blue-500/20 shadow-sm">
                                                    {student.level || t("not_available")}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8 ltr:text-right rtl:text-left">
                                                <div className="flex items-center justify-center ltr:md:justify-end rtl:md:justify-start gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditStudent(student)}
                                                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                                    >
                                                        <Pencil size={18} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(student)}
                                                        className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </Tabs>
            </main>

            <StudentDialog
                open={studentDialogOpen}
                onOpenChange={setStudentDialogOpen}
                student={selectedStudent}
                onSuccess={loadStudents}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("purge_record")}
                description={t("purge_description")}
            />
        </div>
    );
}
