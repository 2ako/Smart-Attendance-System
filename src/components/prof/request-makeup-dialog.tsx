"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { Loader2, Calendar, Clock } from "lucide-react";

interface RequestMakeUpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schedule: any;
    professorId: string;
}

export function RequestMakeUpDialog({
    open,
    onOpenChange,
    schedule,
    professorId,
}: RequestMakeUpDialogProps) {
    const { t } = useTranslation();
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [group, setGroup] = useState("all");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!date || !time) {
            toast.error(t("error_occurred"));
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/prof/make-up-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    professorId,
                    subjectId: schedule?.subject?._id,
                    type: schedule?.subject?.type || "cour",
                    group: group,
                    requestedDate: date,
                    requestedTime: time,
                    comment,
                }),
            });

            if (!res.ok) throw new Error("Failed to submit request");

            toast.success(t("makeup_request_sent"));
            onOpenChange(false);
            // Reset form
            setDate("");
            setTime("");
            setComment("");
        } catch (error) {
            toast.error(t("error_occurred"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl p-0 bg-card flex flex-col max-h-[95vh] overflow-hidden">
                <div className="bg-primary/5 p-8 border-b border-primary/10 shrink-0">
                    <DialogHeader>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary mb-4 w-fit">
                            <Calendar size={12} />
                            {t("makeup_class")}
                        </div>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                            {t("request_makeup_title")}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
                            {schedule?.subject?.name} • {t(`format_${(schedule?.subject?.type || "lecture").toLowerCase()}`)}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-none">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("makeup_date")}
                            </Label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-14 pl-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary font-bold text-sm transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("makeup_time")}
                            </Label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="h-14 pl-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary font-bold text-sm transition-all"
                                />
                            </div>
                        </div>

                        {(schedule?.subject?.type === "td" || schedule?.subject?.type === "tp") && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    {t("makeup_group")}
                                </Label>
                                <select
                                    value={group}
                                    onChange={(e) => setGroup(e.target.value)}
                                    className="w-full h-14 px-4 rounded-2xl border-none bg-muted/50 focus:ring-2 focus:ring-primary font-bold text-sm transition-all appearance-none"
                                >
                                    <option value="all">{t("all")}</option>
                                    <option value="G1">G1</option>
                                    <option value="G2">G2</option>
                                    <option value="G3">G3</option>
                                    <option value="G4">G4</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("professor_comment")} ({t("optional")})
                            </Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={t("describe_requirements")}
                                className="min-h-[100px] rounded-2xl border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary font-medium text-sm p-4 resize-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 shrink-0">
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 hover:bg-muted transition-all"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !date || !time}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-2 transition-all"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                t("send")
                            )}
                            {t("confirm")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
