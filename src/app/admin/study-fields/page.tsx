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
    Search,
    Plus,
    Pencil,
    Trash2,
    GraduationCap,
    Loader2,
    Layers,
    Binary
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StudyFieldDialog } from "@/components/admin/study-field-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { useTranslation } from "@/lib/i18n/context";

export default function StudyFieldsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedField, setSelectedField] = useState<any>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/study-fields");
            if (res.ok) {
                const data = await res.json();
                const fields = data.studyFields || [];
                const configs = data.academicConfigs || [];

                const mergedFields = fields.map((field: any) => {
                    const relatedConfigs = configs.filter(
                        (ac: any) => ac.studyField === field.code || ac.studyField === field._id
                    );

                    const specMap = new Map();

                    (field.specialties || []).forEach((s: any) => {
                        const name = typeof s === "string" ? s : s.name;
                        if (!name) return;
                        specMap.set(name, {
                            name,
                            levels: new Set(s.levels || []),
                            groups: new Set(s.groups || [])
                        });
                    });

                    relatedConfigs.forEach((config: any) => {
                        (config.specialties || []).forEach((cs: any) => {
                            const name = cs.name;
                            if (!name) return;

                            if (specMap.has(name)) {
                                const existing = specMap.get(name);
                                existing.levels.add(config.level);
                                (cs.groups || []).forEach((g: string) => existing.groups.add(g));
                            } else {
                                specMap.set(name, {
                                    name,
                                    levels: new Set([config.level]),
                                    groups: new Set(cs.groups || [])
                                });
                            }
                        });
                    });

                    const finalSpecialties = Array.from(specMap.values()).map(s => ({
                        name: s.name,
                        levels: Array.from(s.levels).sort(),
                        groups: Array.from(s.groups).sort()
                    }));

                    return { ...field, specialties: finalSpecialties.length > 0 ? finalSpecialties : field.specialties };
                });

                setStudyFields(mergedFields);
            } else {
                throw new Error("Failed to load study fields");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load study fields");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = () => {
        setSelectedField(null);
        setDialogOpen(true);
    };

    const handleEdit = (field: any) => {
        setSelectedField(field);
        setDialogOpen(true);
    };

    const handleDelete = (field: any) => {
        setSelectedField(field);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedField) return;
        try {
            const res = await fetch(`/api/admin/study-fields?id=${selectedField._id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success(t("success_course_updated")); // Using existing course updated success key
                loadData();
            } else {
                throw new Error(t("failed_operation"));
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filtered = studyFields.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role="admin" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="mb-10 animate-enter flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                            <GraduationCap className="text-primary w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("university_structure")}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">
                            {t("study_fields")}
                        </h1>
                        <p className="mt-2 text-muted-foreground font-medium max-w-xl">
                            {t("study_fields_desc")}
                        </p>
                    </div>

                    <Button onClick={handleCreate} className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                        <Plus size={16} /> {t("add_study_field")}
                    </Button>
                </div>

                <div className="mb-6 flex items-center gap-4 animate-enter" style={{ animationDelay: "100ms" }}>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("find_student_placeholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 rounded-2xl bg-card border-border/50 focus-visible:ring-primary shadow-sm font-medium"
                        />
                    </div>
                </div>

                <Card className="rounded-[32px] border-border/50 bg-card shadow-sm overflow-hidden animate-enter" style={{ animationDelay: "200ms" }}>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[300px] h-14 uppercase text-[10px] font-bold tracking-widest text-muted-foreground">{t("full_name")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">{t("subject_code")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">{t("system_label")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">{t("levels_label")}</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">{t("specialties_label")}</TableHead>
                                    <TableHead className="text-right uppercase text-[10px] font-bold tracking-widest text-muted-foreground pr-6">{t("actions_label")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                <p className="text-xs font-bold uppercase tracking-widest">{t("loading_records")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                                <p className="text-sm font-bold">{t("no_fields_found")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((f) => (
                                        <TableRow key={f._id} className="group hover:bg-muted/10 transition-colors">
                                            <TableCell className="font-bold text-foreground">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        <GraduationCap size={16} />
                                                    </div>
                                                    <span className="line-clamp-1">{f.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 px-2.5 py-1">
                                                    {f.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest border-none",
                                                    f.systemType === 'LMD' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-amber-500/10 text-amber-600'
                                                )}>
                                                    <Binary size={10} className="mr-1.5" />
                                                    {f.systemType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {f.years?.map((year: string, i: number) => (
                                                        <span key={i} className="text-[9px] font-bold bg-muted p-1 px-1.5 rounded-md text-muted-foreground uppercase border border-border/50">
                                                            {year}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {f.specialties?.length > 0 ? (
                                                        f.specialties.map((s: any, i: number) => {
                                                            const name = typeof s === 'string' ? s : s.name;
                                                            const groupCount = typeof s === 'string' ? 0 : (s.groups?.length || 0);
                                                            return (
                                                                <Badge key={i} variant="outline" className="text-[9px] font-black uppercase tracking-tight border-primary/20 text-primary bg-primary/5 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    {name}
                                                                    {groupCount > 0 && (
                                                                        <span className="opacity-50 font-medium">({groupCount} G)</span>
                                                                    )}
                                                                </Badge>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase italic ml-1">{t("universal")}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </main>

            <StudyFieldDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                studyField={selectedField}
                onSuccess={loadData}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_field_confirm")}
                description={t("delete_field_desc", { name: selectedField?.name || "" })}
            />
        </div>
    );
}
