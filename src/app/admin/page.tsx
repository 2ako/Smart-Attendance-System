"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Fingerprint,
    Shield,
    BookOpen,
    Cpu,
    ChevronRight,
    Search,
    Plus,
    Trash2,
    MapPin,
} from "lucide-react";
import { AcademicStructureManager } from "@/components/admin/academic-structure-manager";
import { StudentDialog } from "@/components/admin/student-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export default function AdminDashboard() {
    const { t, lang } = useTranslation();
    const { user, loading } = useAuth();
    const isSuperAdmin = user && (user as any).role === "admin" && !(user as any).studyField;

    const [students, setStudents] = useState<any[]>([]);
    const [stats, setStats] = useState({ students: 0, devices: 0, rooms: 0, subjects: 0, admins: 0, professors: 0 });
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Dialog States
    const [studentDialogOpen, setStudentDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const [academicConfigs, setAcademicConfigs] = useState<any[]>([]);

    async function loadAdminData() {
        if (!user && loading) return;
        setIsLoading(true);
        try {
            console.log("AdminDashboard: Fetching unified dashboard data...");
            const res = await fetch("/api/admin/stats");
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to fetch dashboard data");
            }

            const data = await res.json();
            console.log("AdminDashboard: Unified data received:", data);

            setStats(data.stats);
            setAcademicConfigs(data.academicConfigs || []);
            setStudents(data.students || []);

            console.log("AdminDashboard: State updated successfully.");
        } catch (error) {
            console.error("AdminDashboard: Error loading admin data:", error);
            toast.error(t("sync_statistics"));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!loading && user) {
            loadAdminData();
        }
    }, [user, loading]);

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

        // Optimistic update
        setStudents(prev => prev.filter(s => s._id !== selectedStudent._id));
        setStats(prev => ({ ...prev, students: Math.max(0, prev.students - 1) }));

        try {
            const res = await fetch(`/api/students?id=${selectedStudent._id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || t("error"));
            }
            toast.success(t("success_occurred"));
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast.error(error.message || t("error"));
        } finally {
            loadAdminData();
        }
    };

    const filteredStudents = students.filter(
        (s) =>
            (s.fullName || s.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.matricule || "").includes(searchTerm) ||
            (s.studyField || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.degree || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.level || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isSuperAdmin) {
        return (
            <div className="flex min-h-screen bg-background selection:bg-primary/20">
                <Sidebar role="admin" />
                <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                    <div className="max-w-7xl mx-auto text-start">
                        {/* ── Header ────────────────────────────────────────── */}
                        <div className="mb-10 animate-enter text-start">
                            <div className="flex items-center gap-3 mb-4 text-start">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary text-start">
                                    <Shield size={12} />
                                    {t("university_directorship")}
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-start">
                                <div className="space-y-1 text-start">
                                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-start">{t("global_overview")}</h1>
                                    <p className="text-muted-foreground font-medium max-w-2xl text-sm leading-relaxed text-start">
                                        {t("global_overview_desc")}
                                    </p>
                                </div>
                                <div className="flex gap-4 text-start">
                                    <Link href="/admin/users">
                                        <Button className="rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all gap-2 text-start">
                                            <Users size={16} /> {t("manage_identities")}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* ── Global Stats Grid ───────────────────────────────── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-enter [animation-delay:100ms] text-start">
                            {[
                                { title: t("total_students_count"), value: stats.students, icon: <Users size={24} />, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                                { title: t("faculty_staff"), value: stats.professors, icon: <Fingerprint size={24} />, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                                { title: t("professors"), value: stats.admins, icon: <Shield size={24} />, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                                { title: t("global_subjects"), value: stats.subjects, icon: <BookOpen size={24} />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                            ].map((s, i) => (
                                <Card key={i} className="rounded-3xl border-border bg-card shadow-sm hover:shadow-md transition-all group overflow-hidden relative text-start">
                                    <div className={`absolute top-0 ltr:right-0 rtl:left-0 p-8 opacity-10 ${s.color} transform ltr:translate-x-4 rtl:-translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500 text-start`}>
                                        {s.icon}
                                    </div>
                                    <CardContent className="p-8 relative z-10 text-start">
                                        <div className={`h-12 w-12 rounded-2xl ${s.bg} ${s.color} border ${s.border} flex items-center justify-center mb-6 text-start`}>
                                            {s.icon}
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-start">{s.title}</p>
                                        <h3 className="text-4xl font-black text-foreground text-start">{isLoading ? "..." : s.value}</h3>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* ── Infrastructure status ────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter [animation-delay:200ms] text-start">
                            <Card className="rounded-3xl border-border bg-card shadow-sm hover:border-primary/30 transition-colors text-start">
                                <CardHeader className="p-8 border-b border-border/50 text-start">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-start">
                                        <Cpu size={18} className="text-primary" /> {t("connected_infrastructure")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 text-start">
                                    <div className="flex items-center justify-between mb-8 text-start">
                                        <div className="text-start">
                                            <p className="text-sm font-bold text-foreground mb-1 text-start">{t("iot_attendance_devices")}</p>
                                            <p className="text-xs text-muted-foreground text-start">{t("esp32_rfid_scanners")}</p>
                                        </div>
                                        <p className="text-2xl font-black text-start">{isLoading ? "..." : stats.devices}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-start">
                                        <div className="text-start">
                                            <p className="text-sm font-bold text-foreground mb-1 text-start">{t("registered_rooms")}</p>
                                            <p className="text-xs text-muted-foreground text-start">{t("classrooms_amphis")}</p>
                                        </div>
                                        <p className="text-2xl font-black text-start">{isLoading ? "..." : stats.rooms}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-border bg-card shadow-sm hover:border-primary/30 transition-colors bg-gradient-to-br from-card to-primary/5 text-start">
                                <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center text-start">
                                    <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6 text-start">
                                        <Shield size={32} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase text-foreground mb-2 tracking-tight text-start">{t("access_control")}</h3>
                                    <p className="text-sm font-medium text-muted-foreground mb-8 max-w-sm text-start">
                                        {t("access_control_desc")}
                                    </p>
                                    <Link href="/admin/users" className="w-full text-start">
                                        <Button className="w-full rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 shadow-sm border border-border bg-background hover:bg-muted/50 transition-all text-foreground flex items-center justify-center gap-2 text-start">
                                            {t("open_identity_registry")} <ChevronRight size={14} className="rtl:rotate-180" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden text-start">
                <div className="mb-10 animate-enter text-start">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4 text-start">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary text-start" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary text-start">{t("admin_console")}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-start">
                        <div className="text-start">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-start">
                                {t("system_management")}
                            </h1>
                            <p className="mt-2 text-muted-foreground font-medium max-w-xl text-start">
                                {t("system_management_desc")}
                            </p>
                        </div>
                        <div className="flex gap-4 p-4 rounded-2xl bg-muted/50 border border-border text-start">
                            <div className="text-center px-4 border-r ltr:border-r rtl:border-l border-border text-start">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 text-start">{t("status")}</p>
                                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase text-start">{t("operational")}</p>
                            </div>
                            <div className="text-center px-4 text-start">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 text-start">{t("sync")}</p>
                                <p className="text-xs font-bold text-foreground uppercase text-start">{t("stable")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-enter [animation-delay:100ms] text-start">
                    {[
                        { label: t("total_students"), value: stats.students, icon: <Users size={20} />, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
                        { label: t("active_subjects"), value: stats.subjects, icon: <BookOpen size={20} />, color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
                        { label: t("devices"), value: stats.devices, icon: <Cpu size={20} />, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
                        { label: t("rooms_assigned"), value: stats.rooms, icon: <MapPin size={20} />, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
                    ].map((stat) => (
                        <Card key={stat.label} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden group hover:scale-[1.02] transition-all cursor-default text-start">
                            <CardContent className="p-6 text-start">
                                <div className="flex items-center justify-between mb-4 text-start">
                                    <div className={`p-3 rounded-xl border ${stat.color} text-start`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 text-start">{stat.label}</p>
                                <h3 className="text-3xl font-black tracking-tight text-foreground text-start">{isLoading ? "..." : stat.value}</h3>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="animate-enter [animation-delay:200ms] mb-12 text-start">
                    <AcademicStructureManager
                        initialConfigs={academicConfigs}
                        initialUser={user}
                    />
                </div>
            </main>

            <StudentDialog
                open={studentDialogOpen}
                onOpenChange={setStudentDialogOpen}
                student={selectedStudent}
                onSuccess={loadAdminData}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_student_record_title")}
                description={
                    <div className="text-start">
                        {t("delete_student_desc").split(selectedStudent?.user?.name || "").map((part, i, arr) => (
                            <span key={i}>
                                {part}
                                {i < arr.length - 1 && <span className="font-bold text-foreground">{selectedStudent?.user?.name}</span>}
                            </span>
                        ))}
                    </div>
                }
            />
        </div>
    );
}
