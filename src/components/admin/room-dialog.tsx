// ============================================================
// RoomDialog — Modal for Managing Classrooms
// ============================================================

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
import { MapPin, Users, Layers, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface RoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    room?: any;
    onSuccess: () => void;
}

export function RoomDialog({
    open, onOpenChange, room, onSuccess }: RoomDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        capacity: "",
        floor: "",
        studyFieldId: "",
    });

    useEffect(() => {
        if (open) {
            // Fetch study fields
            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => setStudyFields(data.studyFields || []))
                .catch(err => console.error("Failed to fetch study fields:", err));

            if (room) {
                setFormData({
                    name: room.name || "",
                    capacity: room.capacity?.toString() || "",
                    floor: room.floor?.toString() || "",
                    studyFieldId: room.studyField?._id || room.studyField?._ref || (typeof room.studyField === 'string' ? room.studyField : ""),
                });
            } else {
                setFormData({
                    name: "",
                    capacity: "",
                    floor: "",
                    studyFieldId: currentUser?.studyField || "",
                });
            }
        }
    }, [open, room, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = "/api/admin/rooms";
            const method = room ? "PUT" : "POST";
            const body = room ? { ...formData, _id: room._id } : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error("Server Error: Unable to process request. Please check if the room name already exists.");
            }

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            toast.success(room ? t("room_updated_success") : t("room_created_success"));
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-none p-0 bg-background shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10">
                    <DialogHeader className="p-8 pb-4">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <MapPin size={24} />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                                {room ? t("edit_room") : t("add_new_room")}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="font-medium text-start">
                            {room ? t("modify_room_desc") : t("register_space_desc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-8 py-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-none">
                        {/* Study Field Selection */}
                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("study_field_faculty")}</Label>
                            {!!currentUser?.studyField ? (
                                <div className="h-12 bg-muted/30 border-none rounded-2xl px-4 flex items-center gap-2 opacity-80">
                                    <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                        {studyFields.find((f: any) =>
                                            (f.code?.toUpperCase() === String(formData.studyFieldId || "").toUpperCase()) ||
                                            f._id === formData.studyFieldId
                                        )?.name || (typeof formData.studyFieldId === 'string' ? formData.studyFieldId : "") || t("loading")}
                                    </span>
                                    <span className="ml-auto text-[8px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">{t("role")}</span>
                                </div>
                            ) : (
                                <Select
                                    value={formData.studyFieldId}
                                    onValueChange={(val) => setFormData({ ...formData, studyFieldId: val })}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={18} className="text-muted-foreground" />
                                            <SelectValue placeholder={t("select_faculty")} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        {studyFields.map((f: any) => (
                                            <SelectItem key={f._id} value={f._id} className="rounded-xl font-medium">
                                                {f.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("room_name")}</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <MapPin size={18} />
                                </div>
                                <Input
                                    placeholder={t("room_placeholder")}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-start">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("capacity")}</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Users size={18} />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="120"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("floor")}</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Layers size={18} />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.floor}
                                        onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                        className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 px-6"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    {t("loading")}
                                </span>
                            ) : (
                                t("confirm")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
