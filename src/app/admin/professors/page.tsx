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
import { Label } from "@/components/ui/label";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Filter,
    Users,
    UserCheck,
    Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfDialog } from "@/components/admin/prof-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { toast } from "sonner";

import { sanityClient } from "@/lib/sanity/client";
import { getAllProfessors } from "@/lib/sanity/queries";

import { useTranslation } from "@/lib/i18n/context";

export default function AdminProfessorsDashboard() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const [professors, setProfessors] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Dialog States
    const [profDialogOpen, setProfDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProf, setSelectedProf] = useState<any>(null);

    async function loadProfessors() {
        setIsLoading(true);
        try {
            const data = await sanityClient.fetch(getAllProfessors, { studyField: user?.studyField || "" });
            setProfessors(data || []);
        } catch (error) {
            console.error("Error loading professors:", error);
            toast.error(t("error"));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!loading) {
            loadProfessors();
        }
    }, [loading, user?.studyField]);

    const handleAddProf = () => {
        setSelectedProf(null);
        setProfDialogOpen(true);
    };

    const handleEditProf = (prof: any) => {
        setSelectedProf(prof);
        setProfDialogOpen(true);
    };

    const handleDeleteClick = (prof: any) => {
        setSelectedProf(prof);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedProf) return;

        // Optimistic update
        setProfessors(prev => prev.filter(p => p._id !== selectedProf._id));

        try {
            const res = await fetch(`/api/professors?id=${selectedProf._id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete professor");
            }
            toast.success(t("success"));
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast.error(error.message || t("error"));
        } finally {
            loadProfessors();
        }
    };

    const filteredProfessors = professors.filter(
        (p) =>
            p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
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
                                {t("manage_professors")}
                            </h1>
                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                                <Users size={16} className="text-primary/70" />
                                {t("total")}: {professors.length} {t("academic_staff")}
                            </p>
                        </div>
                    </header>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-5 w-5" />
                            <Input
                                placeholder={t("prof_search_placeholder")}
                                className="ltr:pl-12 rtl:pr-12 h-14 bg-card border-none shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-bold uppercase tracking-widest text-[10px] bg-card border-none shadow-sm text-foreground hover:bg-muted/50 transition-all">
                            <Filter size={16} /> {t("filter")}
                        </Button>
                        <Button
                            onClick={handleAddProf}
                            className="h-14 px-8 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus size={18} /> {t("add_new")}
                        </Button>
                    </div>

                    {/* Professors Table */}
                    <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 py-6 px-8">
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-primary">
                                <UserCheck className="h-6 w-6 text-primary p-1 bg-primary/10 rounded-lg" />
                                {t("staff_directory")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-8 ltr:rounded-tl-3xl rtl:rounded-tr-3xl">{t("prof_name")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("contact_area")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("identifier")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground px-4">{t("department")}</TableHead>
                                            <TableHead className="py-5 font-bold uppercase tracking-widest text-[10px] text-muted-foreground ltr:text-right rtl:text-left px-8 ltr:rounded-tr-3xl rtl:rounded-tl-3xl">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-[300px] text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                                                        <p className="font-medium animate-pulse">{t("loading")}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredProfessors.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-[300px] text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <UserCheck className="h-12 w-12 opacity-20 mb-2" />
                                                        <p className="font-bold text-lg">{t("no_profs_found")}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredProfessors.map((prof, i) => (
                                                <TableRow key={prof._id} className="group hover:bg-muted/40 transition-colors border-border/50">
                                                    <TableCell className="py-5 px-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
                                                                <UserCheck className="h-5 w-5 text-primary opacity-80" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                                    {prof.user?.name || t("unknown_user")}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                                                    {prof.specialization || t("all")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                                                                <Briefcase size={14} />
                                                            </div>
                                                            <span className="font-medium text-sm text-foreground/80">{prof.user?.email || t("no_email")}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-4 font-mono text-sm tracking-tight font-medium text-muted-foreground">{prof.employeeId || "—"}</TableCell>
                                                    <TableCell className="py-5 px-4">
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-lg px-3 py-1 font-bold tracking-widest text-[10px] uppercase">
                                                            {prof.department || t("not_available")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-8 ltr:text-right rtl:text-left">
                                                        <div className="flex ltr:justify-end rtl:justify-start gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                                                onClick={() => handleEditProf(prof)}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                onClick={() => handleDeleteClick(prof)}
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

            <ProfDialog
                open={profDialogOpen}
                onOpenChange={setProfDialogOpen}
                professor={selectedProf}
                onSuccess={loadProfessors}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("remove_staff")}
                description={t("remove_staff_description")}
            />
        </div >
    );
}
