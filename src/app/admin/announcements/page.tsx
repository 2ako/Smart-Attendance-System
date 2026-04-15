"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Trash2, Calendar, Users, Megaphone, Pencil, Info, MapPin, Eye, Filter, Loader2, RefreshCw, Send, Download, Shield, Globe, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminAnnouncementDialog } from "@/components/admin/admin-announcement-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { useTranslation } from "@/lib/i18n/context";

export default function AdminAnnouncementsPage() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
    const [dialogMode, setDialogMode] = useState<"view" | "edit">("edit");

    const loadData = async () => {
        setIsLoading(true);
        try {
            // We fetch the announcements
            const res = await fetch("/api/admin/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);
            }

            // Also fetch all subjects so we can select them
            const subjRes = await fetch("/api/subjects");
            if (subjRes.ok) {
                const subjData = await subjRes.json();
                setSubjects(subjData.subjects || []);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("error"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            loadData();
        }
    }, [loading, user?.studyField]);

    const handleCreate = () => {
        setSelectedAnnouncement(null);
        setDialogMode("edit");
        setDialogOpen(true);
    };

    const handleEdit = (announcement: any, mode: "view" | "edit" = "edit") => {
        setSelectedAnnouncement(announcement);
        setDialogMode(mode);
        setDialogOpen(true);
    };

    const handleDelete = (announcement: any) => {
        setSelectedAnnouncement(announcement);
        setTimeout(() => setDeleteDialogOpen(true), 0);
    };

    const confirmDelete = async () => {
        if (!selectedAnnouncement) return;
        try {
            const res = await fetch(`/api/admin/announcements?id=${selectedAnnouncement._id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success(t("success"));
                loadData();
            } else {
                throw new Error(t("error"));
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filtered = announcements.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="mb-10 animate-enter flex flex-col md:flex-row md:items-end justify-between gap-6 text-start">
                    <div className="text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                            <Megaphone className="text-primary w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("communications")}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                            {t("announcements")}
                        </h1>
                        <p className="mt-2 text-muted-foreground font-medium max-w-xl text-start">
                            {t("announcements_desc")}
                        </p>
                    </div>

                    <Button onClick={handleCreate} className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                        <Plus size={16} /> {t("broadcast_message")}
                    </Button>
                </div>

                <div className="mb-6 flex items-center gap-4 animate-enter" style={{ animationDelay: "100ms" }}>
                    <div className="relative w-full max-w-md text-start">
                        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-start" />
                        <Input
                            placeholder={t("search_broadcasts_placeholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ltr:pl-11 rtl:pr-11 h-12 rounded-2xl bg-card border-border/50 focus-visible:ring-primary shadow-sm font-medium text-start"
                        />
                    </div>
                </div>

                <div className="animate-enter" style={{ animationDelay: "200ms" }}>
                    {user?.studyField ? (
                        <Tabs defaultValue="sent" className="w-full text-start">
                            <TabsList className="mb-6 h-12 bg-muted/50 rounded-2xl p-1 w-full max-w-md grid grid-cols-2 text-start">
                                <TabsTrigger value="sent" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    {t("sent_broadcasts")}
                                </TabsTrigger>
                                <TabsTrigger value="received" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    {t("directives_super_admin")}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="sent">
                                <AnnouncementsTable
                                    data={filtered.filter((a) => (a.studyField || "") === (user?.studyField || ""))}
                                    isLoading={isLoading}
                                    user={user}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    t={t}
                                />
                            </TabsContent>
                            <TabsContent value="received">
                                <AnnouncementsTable
                                    data={filtered.filter((a) => (a.studyField || "") !== (user?.studyField || ""))}
                                    isLoading={isLoading}
                                    user={user}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    setAnnouncementToDelete={setSelectedAnnouncement}
                                    t={t}
                                />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <AnnouncementsTable
                            data={filtered}
                            isLoading={isLoading}
                            user={user}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            setAnnouncementToDelete={setSelectedAnnouncement}
                            t={t}
                        />
                    )}
                </div>
            </main>

            <AdminAnnouncementDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                announcement={selectedAnnouncement}
                initialMode={dialogMode}
                onSuccess={loadData}
                subjects={subjects}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_announcement_title")}
                description={<>{t("delete_announcement_desc")} "<span className="font-bold text-foreground">{selectedAnnouncement?.title}</span>".</>}
            />
        </div >
    );
}

// Extracted inner table component
function AnnouncementsTable({ data, isLoading, user, handleEdit, handleDelete, setAnnouncementToDelete, t }: any) {
    return (
        <Card className="rounded-[32px] border-border/50 bg-card shadow-sm overflow-hidden text-start">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto text-start">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="text-start">
                            <TableHead className="w-[300px] h-14 uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("notice_title")}</TableHead>
                            <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("audience")}</TableHead>
                            <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("status")}</TableHead>
                            <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("date_published")}</TableHead>
                            <TableHead className="ltr:text-right rtl:text-left text-start uppercase text-[10px] font-bold tracking-widest text-muted-foreground ltr:pr-6 rtl:pl-6">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <p className="text-xs font-bold uppercase tracking-widest">{t("loading_broadcasts")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Megaphone className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                        <p className="text-sm font-bold">{t("no_announcements_found")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((a: any) => (
                                <TableRow key={a._id} className="group hover:bg-muted/10 transition-colors text-start">
                                    <TableCell className="font-bold text-foreground text-start">
                                        <span className="line-clamp-1">{a.title}</span>
                                    </TableCell>
                                    <TableCell className="text-start">
                                        {a.targetAudience === 'faculty_admins' ? (
                                            <div className="flex flex-wrap gap-1 text-start">
                                                {a.targetFaculties && a.targetFaculties.length > 0 ? (
                                                    a.targetFaculties.map((f: any) => (
                                                        <Badge key={f._id} variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-purple-500/20 text-purple-600 bg-purple-500/10">
                                                            <Shield size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                            {f.name}
                                                        </Badge>
                                                    ))
                                                ) : a?.targetFaculty ? (
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-purple-500/20 text-purple-600 bg-purple-500/10">
                                                        <Shield size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                        {t("faculty_admins_label", { faculty: a.targetFaculty?.name || "..." }).replace("{{faculty}}", a.targetFaculty?.name || "...")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-bold uppercase tracking-widest border-purple-500/20",
                                                        a.studyField !== user?.studyField ? "text-purple-600 bg-purple-500/10 animate-pulse" : "text-purple-600 bg-purple-500/10"
                                                    )}>
                                                        <Shield size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                        {a.studyField !== user?.studyField ? t("from_super_admin") : t("all_faculty_admins")}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : a.isGlobal || (!a.level && !a.subject) ? (
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600 bg-emerald-500/10">
                                                <Globe size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                {t("global")}
                                            </Badge>
                                        ) : a.subject ? (
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-blue-500/20 text-blue-600 bg-blue-500/10">
                                                <BookOpen size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                {a?.subject?.name || t("unknown_subject")}
                                            </Badge>
                                        ) : (
                                            <div className="flex flex-col gap-1 text-start">
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600 bg-amber-500/10 w-fit">
                                                    <Users size={10} className="ltr:mr-1.5 rtl:ml-1.5" />
                                                    {a?.level || ""} {a?.specialty || ""}
                                                </Badge>
                                                {a?.group && (
                                                    <span className="text-[10px] font-bold text-muted-foreground ltr:ml-1 rtl:mr-1">{t("group")}: {a.group}</span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-start">
                                        <Badge variant="secondary" className={cn("text-[9px] font-bold uppercase tracking-widest", a.status === 'published' ? 'bg-primary/20 text-primary' : '')}>
                                            {t(a.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-muted-foreground text-start">
                                        {new Date(a._createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="ltr:text-right rtl:text-left text-start ltr:pr-6 rtl:pl-6">
                                        {((a.studyField || "") === (user?.studyField || "")) ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(a, "edit")}
                                                    className="h-8 rounded-lg text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest px-3"
                                                >
                                                    <Pencil size={12} className="mr-1.5" />
                                                    {t("edit")}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(a)}
                                                    className="h-8 w-8 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 p-0"
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex ltr:justify-end rtl:justify-start gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleEdit(a, "view");
                                                    }}
                                                    className="h-8 rounded-lg text-primary bg-primary/5 hover:bg-primary/20 text-[10px] uppercase font-black tracking-widest px-4 border border-primary/20 shadow-sm"
                                                >
                                                    <Eye size={12} className="mr-1.5" />
                                                    {t("view")}
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-44 bg-muted/20 animate-pulse rounded-[2rem]" />
                    ))
                ) : data.length === 0 ? (
                    <div className="py-20 text-center opacity-40 text-start">
                        <Megaphone size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">{t("no_broadcasts")}</p>
                    </div>
                ) : (
                    data.map((a: any) => (
                        <div key={a._id} className="p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-4 relative overflow-hidden group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 text-start">
                                    <h3 className="font-extrabold text-lg text-foreground uppercase tracking-tight line-clamp-2">{a.title}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="secondary" className={cn("text-[8px] font-black uppercase tracking-widest", a?.status === 'published' ? 'bg-primary/20 text-primary' : '')}>
                                            {t(a?.status || "published")}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-muted-foreground">{a?._createdAt ? new Date(a._createdAt).toLocaleDateString() : ""}</span>
                                    </div>
                                </div>
                                {((a.studyField || "") === (user?.studyField || "")) ? (
                                    <div className="flex flex-col gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(a)} className="h-9 w-9 rounded-xl bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                                            <Pencil size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a)} className="h-9 w-9 rounded-xl bg-muted/20 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(a, ((a.studyField || "") === (user?.studyField || "")) ? "edit" : "view")}
                                                className="h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-black text-[10px] uppercase px-4 flex items-center gap-2"
                                            >
                                                <Eye size={14} />
                                                {t("view")}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setAnnouncementToDelete(a)}
                                                className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator className="bg-border/30" />

                            <div className="p-3 rounded-2xl bg-muted/10 border border-border/50 text-start">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("audience")}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {a?.targetAudience === 'faculty_admins' ? (
                                        <span className="text-[11px] font-bold text-purple-600">{t("faculty_admins")}</span>
                                    ) : a?.isGlobal || (!a?.level && !a?.subject) ? (
                                        <span className="text-[11px] font-bold text-emerald-600">{t("global")}</span>
                                    ) : a?.subject ? (
                                        <span className="text-[11px] font-bold text-blue-600">{a.subject?.name || "..."}</span>
                                    ) : (
                                        <span className="text-[11px] font-bold text-amber-600">{a?.level || ""} {a?.specialty || ""} {a?.group ? `• G${a.group}` : ''}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
