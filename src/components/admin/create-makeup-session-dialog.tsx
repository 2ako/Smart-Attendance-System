"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { Loader2, MapPin, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreateMakeUpSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: any;
    onSuccess: () => void;
}

export function CreateMakeUpSessionDialog({
    open,
    onOpenChange,
    request,
    onSuccess,
}: CreateMakeUpSessionDialogProps) {
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<any[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState("");
    const [adminComment, setAdminComment] = useState("");
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchRooms();
        }
    }, [open]);

    const fetchRooms = async () => {
        setIsLoadingRooms(true);
        try {
            const res = await fetch("/api/admin/rooms");
            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms || []);
            }
        } catch (error) {
            console.error("Error fetching rooms:", error);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRoomId) {
            toast.error(t("assign_room"));
            return;
        }

        setIsSubmitting(true);
        try {
            const roomName = rooms.find(r => r._id === selectedRoomId)?.name;
            const res = await fetch("/api/admin/make-up-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: request._id,
                    status: "approved",
                    roomId: selectedRoomId,
                    roomName: roomName,
                    adminComment,
                }),
            });

            if (!res.ok) throw new Error("Failed to approve request");

            toast.success(t("success"));
            onSuccess();
        } catch (error) {
            toast.error(t("error_occurred"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 bg-card flex flex-col max-h-[95vh] overflow-hidden text-start">
                <div className="bg-primary/5 p-8 border-b border-primary/10 text-start shrink-0">
                    <DialogHeader className="text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary mb-4 w-fit text-start">
                            <CheckCircle2 size={12} className="text-primary" />
                            {t("approve_request_title") || "Approve Make-up Request"}
                        </div>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-start">
                            {t("assign_room")}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground mt-2 text-start">
                            {request?.professor?.name} • {request?.subject?.name}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 text-start scrollbar-none">
                    {/* Request Summary Info */}
                    <div className="grid grid-cols-2 gap-4 text-start">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-start">
                            <div className="flex items-center gap-2 mb-1 text-start">
                                <Calendar size={14} className="text-primary/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("makeup_date")}</span>
                            </div>
                            <p className="text-sm font-black text-foreground text-start">{request?.requestedDate}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-start">
                            <div className="flex items-center gap-2 mb-1 text-start">
                                <Clock size={14} className="text-primary/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-start">{t("makeup_time")}</span>
                            </div>
                            <p className="text-sm font-black text-foreground text-start">{request?.requestedTime}</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-start">
                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("select_room") || "Select Room"}
                            </Label>
                            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                                <SelectTrigger className="h-14 rounded-2xl border-none bg-muted/50 focus:ring-2 focus:ring-primary font-bold text-sm text-start">
                                    <SelectValue placeholder={t("room_availability")} />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/50 shadow-xl text-start">
                                    {rooms.length === 0 && !isLoadingRooms ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground text-start">{t("no_rooms_found") || "No rooms found"}</div>
                                    ) : (
                                        rooms.map((room) => (
                                            <SelectItem key={room._id} value={room._id} className="rounded-xl font-bold text-start">
                                                {room.name} {room.capacity ? `(${room.capacity} ${t("students")})` : ""}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("admin_comment") || "Admin Message (Optional)"}
                            </Label>
                            <Textarea
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                                placeholder={t("type_message") || "Message to the professor..."}
                                className="min-h-[100px] rounded-2xl border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary font-medium text-sm p-4 resize-none transition-all text-start"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3 mt-4 text-start">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[11px] font-medium text-amber-600/80 leading-relaxed text-start">
                            {t("makeup_notice") || "Approving will create a one-time session. The professor can open it from the local server during the scheduled time."}
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 text-start shrink-0">
                    <div className="flex gap-3 w-full text-start">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-muted transition-all text-start"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={isSubmitting || !selectedRoomId}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-2 transition-all text-start"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={16} />
                            )}
                            {t("approve")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

