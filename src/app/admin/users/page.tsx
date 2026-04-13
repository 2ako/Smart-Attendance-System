"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    UserCircle,
    Check,
    X,
    Settings2,
    GraduationCap,
    Users,
    Layers,
    Pencil,
    Shield,
    UserPlus,
    Search,
    Loader2,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { UserDialog } from "@/components/admin/user-dialog";
import { useTranslation } from "@/lib/i18n/context";

export default function UsersPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // Filters
    const [filterRole, setFilterRole] = useState("all");
    const [filterField, setFilterField] = useState("all");
    const [filterLevel, setFilterLevel] = useState("all");
    const [filterSpecialty, setFilterSpecialty] = useState("all");
    const [filterGroup, setFilterGroup] = useState("all");

    // Helper to get study field name from code
    const getFieldName = (code: string) => {
        if (!code) return t("university_wide");
        const field = studyFields.find(f => f.code === code || f._id === code);
        return field ? field.name : code;
    };

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, fieldsRes] = await Promise.all([
                fetch("/api/admin/users"),
                fetch("/api/admin/study-fields")
            ]);

            if (usersRes.ok && fieldsRes.ok) {
                const usersData = await usersRes.json();
                const fieldsData = await fieldsRes.json();
                setUsers(usersData.users || []);
                setStudyFields(fieldsData.studyFields || []);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("error_loading_users") || "Failed to load users or study fields");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateScope = async (userId: string, studyField: string) => {
        setUpdatingUserId(userId);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, studyField })
            });

            if (res.ok) {
                toast.success(t("user_scope_updated") || "User scope updated");
                // Update local state
                setUsers(users.map(u =>
                    u._id === userId ? { ...u, studyField: studyField || undefined } : u
                ));
            } else {
                throw new Error("Failed to update scope");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleDelete = (user: any) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedUser) return;
        try {
            const res = await fetch(`/api/admin/users?id=${selectedUser._id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("User deleted successfully");
                setUsers(users.filter(u => u._id !== selectedUser._id));
            } else {
                throw new Error(t("error_deleting_user") || "Failed to delete user");
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filtered = users.filter(u => {
        const matchesSearch =
            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = filterRole === "all" || u.role === filterRole;
        const matchesField = filterField === "all" || (u.studyField === filterField || u.student?.studyField === filterField || u.professor?.studyField === filterField);
        const matchesLevel = filterLevel === "all" || u.student?.level === filterLevel;
        const matchesSpecialty = filterSpecialty === "all" || u.student?.specialty === filterSpecialty;
        const matchesGroup = filterGroup === "all" || u.student?.group === filterGroup;

        return matchesSearch && matchesRole && matchesField && matchesLevel && matchesSpecialty && matchesGroup;
    });

    // Extract unique values for filters
    const levels = Array.from(new Set(users.map(u => u.student?.level).filter(Boolean))) as string[];
    const specialties = Array.from(new Set(users.map(u => u.student?.specialty).filter(Boolean))) as string[];
    const groups = Array.from(new Set(users.map(u => u.student?.group).filter(Boolean))) as string[];

    const handleCreate = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="mb-10 animate-enter flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                            <Shield className="text-primary w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary text-start">{t("governance_panel")}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                            {t("user_access")}
                        </h1>
                        <p className="mt-2 text-muted-foreground font-medium max-w-xl text-start">
                            {t("manage_university_access")}
                        </p>
                    </div>

                    <Button onClick={handleCreate} className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                        <UserPlus size={16} /> {t("add_user")}
                    </Button>
                </div>

                <div className="mb-6 space-y-4 animate-enter text-start" style={{ animationDelay: "100ms" }}>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("search_users")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ltr:pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-2xl bg-card border-border/50 focus-visible:ring-primary shadow-sm font-medium text-start"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 text-start">
                            <Select value={filterRole} onValueChange={setFilterRole}>
                                <SelectTrigger className="h-12 w-[140px] rounded-2xl bg-card border-border/50 shadow-sm font-bold text-[10px] uppercase">
                                    <div className="flex items-center gap-2">
                                        <UserCircle size={14} className="text-primary" />
                                        <SelectValue placeholder={t("role")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="all" className="font-bold text-[10px] py-2 uppercase opacity-70">{t("all_roles")}</SelectItem>
                                    <SelectItem value="admin" className="font-bold text-[10px] py-2 uppercase">{t("filter_admin")}</SelectItem>
                                    <SelectItem value="professor" className="font-bold text-[10px] py-2 uppercase">{t("filter_professor")}</SelectItem>
                                    <SelectItem value="student" className="font-bold text-[10px] py-2 uppercase">{t("filter_student")}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filterField} onValueChange={setFilterField}>
                                <SelectTrigger className="h-12 w-[160px] rounded-2xl bg-card border-border/50 shadow-sm font-bold text-[10px] uppercase">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap size={14} className="text-primary" />
                                        <SelectValue placeholder={t("study_field")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="all" className="font-bold text-[10px] py-2 uppercase opacity-70">{t("all_fields")}</SelectItem>
                                    {studyFields.map(f => (
                                        <SelectItem key={f._id} value={f.code} className="font-bold text-[10px] py-2 uppercase">{f.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterLevel} onValueChange={setFilterLevel}>
                                <SelectTrigger className="h-12 w-[120px] rounded-2xl bg-card border-border/50 shadow-sm font-bold text-[10px] uppercase">
                                    <div className="flex items-center gap-2">
                                        <Layers size={14} className="text-primary" />
                                        <SelectValue placeholder={t("level")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="all" className="font-bold text-[10px] py-2 uppercase opacity-70">{t("all_levels")}</SelectItem>
                                    {levels.sort().map(l => (
                                        <SelectItem key={l} value={l} className="font-bold text-[10px] py-2 uppercase">{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                                <SelectTrigger className="h-12 w-[160px] rounded-2xl bg-card border-border/50 shadow-sm font-bold text-[10px] uppercase">
                                    <div className="flex items-center gap-2">
                                        <Settings2 size={14} className="text-primary" />
                                        <SelectValue placeholder={t("specialty")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="all" className="font-bold text-[10px] py-2 uppercase opacity-70">{t("all_specialties")}</SelectItem>
                                    {specialties.sort().map(s => (
                                        <SelectItem key={s} value={s} className="font-bold text-[10px] py-2 uppercase">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterGroup} onValueChange={setFilterGroup}>
                                <SelectTrigger className="h-12 w-[120px] rounded-2xl bg-card border-border/50 shadow-sm font-bold text-[10px] uppercase">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} className="text-primary" />
                                        <SelectValue placeholder={t("group")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-xl">
                                    <SelectItem value="all" className="font-bold text-[10px] py-2 uppercase opacity-70">{t("all_groups")}</SelectItem>
                                    {groups.sort().map(g => (
                                        <SelectItem key={g} value={g} className="font-bold text-[10px] py-2 uppercase">{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {(filterRole !== "all" || filterField !== "all" || filterLevel !== "all" || filterSpecialty !== "all" || filterGroup !== "all") && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setFilterRole("all");
                                        setFilterField("all");
                                        setFilterLevel("all");
                                        setFilterSpecialty("all");
                                        setFilterGroup("all");
                                    }}
                                    className="h-12 px-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted"
                                >
                                    {t("reset")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <Card className="rounded-[32px] border-border/50 bg-card shadow-sm overflow-hidden animate-enter text-start" style={{ animationDelay: "200ms" }}>
                    <div className="overflow-x-auto text-start">
                        <Table className="text-start">
                            <TableHeader className="bg-muted/30 text-start">
                                <TableRow>
                                    <TableHead className="w-[300px] h-14 uppercase text-[10px] font-bold tracking-widest text-muted-foreground ltr:pl-6 rtl:pr-6 text-start">{t("full_identity")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("role")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-start">{t("administrative_scope")}</TableHead>
                                    <TableHead className="ltr:text-right rtl:text-left uppercase text-[10px] font-bold tracking-widest text-muted-foreground ltr:pr-6 rtl:pl-6">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-start">
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                <p className="text-xs font-bold uppercase tracking-widest">{t("loading")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <UserCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                                <p className="text-sm font-bold">{t("no_users_found")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((u) => {
                                        const isCurrentUser = currentUser?.id === u._id;
                                        const isAdmin = u.role === 'admin';
                                        const isSuperAdmin = isAdmin && !u.studyField;

                                        return (
                                            <TableRow key={u._id} className="group hover:bg-muted/10 transition-colors">
                                                <TableCell className="py-4 ltr:pl-6 rtl:pr-6 text-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden">
                                                            {u.avatar ? (
                                                                <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <UserCircle size={20} className="text-muted-foreground/40" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col text-start">
                                                            <span className="text-sm font-bold tracking-tight text-foreground line-clamp-1">{u.name}</span>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                                {u.username} • {u.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-start">
                                                    <Badge className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5",
                                                        u.role === 'admin' ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' :
                                                            u.role === 'professor' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'
                                                    )}>
                                                        {isSuperAdmin ? t("super_admin_tag") : t("role_" + u.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        {isAdmin ? (
                                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg">
                                                                {getFieldName(u.studyField)}
                                                            </Badge>
                                                        ) : u.role === 'professor' ? (
                                                            <>
                                                                {(() => {
                                                                    const fieldName = getFieldName(u.professor?.studyField || u.professor?.department || u.studyField);
                                                                    const specialization = u.professor?.specialization;
                                                                    return (
                                                                        <>
                                                                            <Badge variant="outline" className="border-border/50 text-muted-foreground text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-muted/30">
                                                                                {fieldName}
                                                                            </Badge>
                                                                            {specialization && specialization.toLowerCase() !== fieldName.toLowerCase() && (
                                                                                <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-primary/5">
                                                                                    {specialization}
                                                                                </Badge>
                                                                            )}
                                                                        </>
                                                                    )
                                                                })()}
                                                            </>
                                                        ) : u.role === 'student' && u.student ? (
                                                            <>
                                                                {(() => {
                                                                    const fieldName = getFieldName(u.student.studyField || u.studyField);
                                                                    const specialty = u.student.specialty || u.student.specialization;
                                                                    return (
                                                                        <>
                                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase border-primary/20 bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                                                                                {u.student.level} {fieldName}
                                                                            </Badge>
                                                                            {specialty && specialty.toLowerCase() !== fieldName.toLowerCase() && (
                                                                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/50 text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/20">
                                                                                    {specialty}
                                                                                </Badge>
                                                                            )}
                                                                        </>
                                                                    )
                                                                })()}
                                                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/50 text-muted-foreground px-1.5 py-0.5 rounded-md border-dashed">
                                                                    {t("group_prefix")} {u.student.group}
                                                                </Badge>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-muted-foreground italic uppercase opacity-40">{t("global_scope")}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="ltr:text-right rtl:text-left ltr:pr-6 rtl:pl-6">
                                                    <div className="flex ltr:justify-end rtl:justify-start gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                                                            <Pencil size={14} />
                                                        </Button>
                                                        {!isCurrentUser && (
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                <div className="mt-4 px-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                    <span>{t("showing_users", { filtered: filtered.length, total: users.length })}</span>
                    <span>{t("system_status_online")}</span>
                </div>
            </main>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                userAccount={selectedUser}
                onSuccess={loadData}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_user_title")}
                description={t("delete_user_desc", { name: selectedUser?.name })}
            />
        </div>
    );
}
