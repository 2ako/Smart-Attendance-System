"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, BookOpen, Trophy, Loader2, Upload, FileText, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface AssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignment?: any;
    professorId: string;
    initialSubjectId?: string | null;
    onSuccess: () => void;
}

export function AssignmentDialog({
    open,
    onOpenChange,
    assignment,
    professorId,
    initialSubjectId,
    onSuccess
}: AssignmentDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subjectId: "",
        dueDate: "",
        type: "homework",
        points: 10,
        status: "published",
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            fetchSubjects();
            if (assignment) {
                setFormData({
                    title: assignment.title || "",
                    description: assignment.description || "",
                    subjectId: assignment.subject?._id || "",
                    dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : "",
                    type: assignment.type || "homework",
                    points: assignment.points || 10,
                    status: assignment.status || "published",
                });
                setExistingAttachments(assignment.attachments || []);
                setSelectedFiles([]);
            } else {
                setFormData({
                    title: "",
                    description: "",
                    subjectId: initialSubjectId || "",
                    dueDate: "",
                    type: "homework",
                    points: 10,
                    status: "published",
                });
                setExistingAttachments([]);
                setSelectedFiles([]);
            }
        }
    }, [open, assignment]);

    const fetchSubjects = async () => {
        try {
            const res = await fetch("/api/prof/classes");
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append("title", formData.title);
            formDataToSend.append("description", formData.description);
            formDataToSend.append("subjectId", formData.subjectId);
            formDataToSend.append("dueDate", new Date(formData.dueDate).toISOString());
            formDataToSend.append("type", formData.type);
            formDataToSend.append("points", formData.points.toString());
            formDataToSend.append("status", formData.status);

            if (assignment?._id) {
                formDataToSend.append("_id", assignment._id);
            }

            selectedFiles.forEach((file) => {
                formDataToSend.append("files", file);
            });

            // Keep track of existing attachments to remove (not implemented here but good for future)
            formDataToSend.append("existingAttachments", JSON.stringify(existingAttachments));

            const method = assignment ? "PUT" : "POST";
            const res = await fetch("/api/assignments", {
                method,
                body: formDataToSend,
            });

            if (res.ok) {
                toast.success(assignment ? t("assignment_updated") : t("assignment_created"));
                onSuccess();
                onOpenChange(false);
            } else {
                const data = await res.json();
                throw new Error(data.message || t("error_occurred"));
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-3xl p-0 bg-card scrollbar-none text-start">
                <DialogHeader className="p-6 pb-0 text-start">
                    <div className="flex items-center gap-3 mb-2 text-start">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <ClipboardList size={22} />
                        </div>
                        <div className="text-start">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-start">
                                {assignment ? t("edit_assignment") : t("new_assignment")}
                            </DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-start">
                                {t("academic_task_config")}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5 text-start">
                    <div className="space-y-4 text-start">
                        <div className="space-y-2 text-start">
                            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("title")}</Label>
                            <div className="relative group text-start">
                                <Input
                                    id="title"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-xl focus:bg-background transition-all px-4 font-bold text-start"
                                    placeholder={t("enter_task_title")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 text-start">
                            <Label htmlFor="subject" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("course_module")}</Label>
                            {initialSubjectId ? (
                                <div className="h-12 bg-muted/20 border border-muted-foreground/10 rounded-xl flex items-center px-4 gap-3 text-start">
                                    <BookOpen size={16} className="text-primary/70" />
                                    <div className="flex-1 flex items-center justify-between text-start">
                                        <span className="font-bold text-sm truncate">
                                            {subjects.find(s => s._id === formData.subjectId)?.name || t("target_module")}
                                        </span>
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-primary/10 text-primary border-none">
                                            {subjects.find(s => s._id === formData.subjectId)?.type || "Cours"}
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                <Select
                                    value={formData.subjectId}
                                    onValueChange={(v) => setFormData({ ...formData, subjectId: v })}
                                    required
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl focus:bg-background transition-all font-bold text-start">
                                        <SelectValue placeholder={t("select_context")} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border bg-card">
                                        {subjects.map((s) => (
                                            <SelectItem key={s._id} value={s._id} className="font-bold cursor-pointer">
                                                <div className="flex items-center justify-between w-full gap-4 text-start" style={{ cursor: "pointer" }}>
                                                    <span>{s.name} ({s.code})</span>
                                                    <Badge variant="secondary" className="ltr:ml-auto rtl:mr-auto text-[9px] font-black uppercase bg-primary/10 text-primary border-none">
                                                        {s.type || "Cours"}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-start">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("task_type")}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl focus:bg-background transition-all font-bold text-start">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border bg-card">
                                        <SelectItem value="homework" className="font-bold">{t("homework")}</SelectItem>
                                        <SelectItem value="project" className="font-bold">{t("project")}</SelectItem>
                                        <SelectItem value="affichage" className="font-bold">{t("affichage")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="points" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("max_points")}</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, points: val === "" ? "" : parseInt(val) as any });
                                    }}
                                    className="h-12 bg-muted/30 border-none rounded-xl focus:bg-background transition-all px-4 font-bold text-start ltr:font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 text-start">
                            <Label htmlFor="dueDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("due_date_time")}</Label>
                            <Input
                                id="dueDate"
                                type="datetime-local"
                                required
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="h-12 bg-muted/30 border-none rounded-xl focus:bg-background transition-all px-4 font-bold text-start"
                            />
                        </div>

                        <div className="space-y-2 text-start">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("instructions_description")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="min-h-[100px] bg-muted/30 border-none rounded-xl focus:bg-background transition-all p-4 font-medium resize-none shadow-sm text-start"
                                placeholder={t("describe_requirements")}
                            />
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-3 pt-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1 text-start">{t("attachments")}</Label>

                            <div className="grid grid-cols-1 gap-2 text-start">
                                {/* Existing Files */}
                                {existingAttachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-xl group text-start">
                                        <div className="flex items-center gap-3 text-start">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <FileText size={16} />
                                            </div>
                                            <span className="text-xs font-bold truncate max-w-[200px] text-start">{t("existing_file")} {idx + 1}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => setExistingAttachments(existingAttachments.filter((_, i) => i !== idx))}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}

                                {/* Selected New Files */}
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl group animate-in slide-in-from-left-2 transition-all text-start">
                                        <div className="flex items-center gap-3 text-start">
                                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                                                {file.type.includes('image') ? <Upload size={16} /> : <FileText size={16} />}
                                            </div>
                                            <div className="flex flex-col text-start">
                                                <span className="text-xs font-bold truncate max-w-[200px] text-start">{file.name}</span>
                                                <span className="text-[10px] text-muted-foreground text-start">{(file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}

                                {/* Dropzone / Input */}
                                <label className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/20 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group text-center">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                                            <Upload size={16} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            {t("upload_assets")}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                                            }
                                        }}
                                        accept=".pdf,image/*"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 text-start">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-12 rounded-xl px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-muted text-start"
                        >
                            {t("dismiss")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 rounded-xl px-8 font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all text-start"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : assignment ? t("update_task") : t("publish_task")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
