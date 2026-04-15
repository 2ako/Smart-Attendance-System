// ============================================================
// DeviceDialog — Modal for Managing IoT Hardware
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Cpu, Key, MapPin, RefreshCw, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/context";

interface DeviceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    device?: any;
    onSuccess: () => void;
}

export function DeviceDialog({
    open, onOpenChange, device, onSuccess }: DeviceDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        deviceId: "",
        deviceToken: "",
        roomId: "",
        type: "hybrid",
        isActive: true,
        studyFieldId: "",
    });

    const generateToken = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let token = "dev_";
        for (let i = 0; i < 24; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    };

    useEffect(() => {
        if (open) {
            fetchRooms();
            // Fetch study fields
            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => setStudyFields(data.studyFields || []))
                .catch(err => console.error("Failed to fetch study fields:", err));

            if (device) {
                setFormData({
                    deviceId: device.deviceId || "",
                    deviceToken: device.deviceToken || "",
                    roomId: device.room?._id || "",
                    type: device.type || "rfid",
                    isActive: device.isActive !== undefined ? device.isActive : true,
                    studyFieldId: device.studyField?._id || device.studyField?._ref || (typeof device.studyField === 'string' ? device.studyField : ""),
                });
            } else {
                setFormData({
                    deviceId: "",
                    deviceToken: generateToken(),
                    roomId: "",
                    type: "hybrid",
                    isActive: true,
                    studyFieldId: currentUser?.studyField || "",
                });
            }
        }
    }, [open, device, currentUser]);

    const fetchRooms = async () => {
        try {
            const [roomsRes, devicesRes] = await Promise.all([
                fetch("/api/admin/rooms"),
                fetch("/api/admin/devices")
            ]);

            if (roomsRes.ok) {
                const roomsData = await roomsRes.json();
                setRooms(roomsData.rooms || []);
            }
            if (devicesRes.ok) {
                const devicesData = await devicesRes.json();
                setDevices(devicesData.devices || []);
            }
        } catch (error) {
            console.error("Failed to fetch rooms/devices:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = "/api/admin/devices";
            const method = device ? "PUT" : "POST";
            const body = device ? { ...formData, _id: device._id } : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || t("error"));
            }

            toast.success(device ? t("device_updated_success") : t("device_created_success"));
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
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-none p-0 bg-background shadow-2xl text-start">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10">
                    <DialogHeader className="p-6 sm:p-8 pb-4 text-start">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Cpu size={24} />
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                                {device ? t("edit_device") : t("register_device")}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="font-medium text-muted-foreground">
                            {device ? t("modify_hardware_desc") : t("onboard_terminal_desc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 sm:px-8 py-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-none">
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
                                    <span className="ltr:ml-auto rtl:mr-auto text-[8px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">{t("auto")}</span>
                                </div>
                            ) : (
                                <Select
                                    value={formData.studyFieldId}
                                    onValueChange={(val) => setFormData({ ...formData, studyFieldId: val, roomId: "" })}
                                >
                                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium text-start">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={18} className="text-muted-foreground" />
                                            <SelectValue placeholder={t("select_faculty")} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                        {studyFields.map((f: any) => (
                                            <SelectItem key={f._id} value={f._id} className="rounded-xl font-medium text-start">
                                                {f.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("device_identity")}</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Cpu size={18} />
                                </div>
                                <Input
                                    placeholder={t("device_id_placeholder")}
                                    value={formData.deviceId}
                                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                    className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative group flex-1">
                                <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Key size={18} />
                                </div>
                                <Input
                                    placeholder={t("secure_token_placeholder")}
                                    value={formData.deviceToken}
                                    onChange={(e) => setFormData({ ...formData, deviceToken: e.target.value })}
                                    className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setFormData({ ...formData, deviceToken: generateToken() })}
                                className="h-12 w-12 rounded-2xl border-none bg-muted/30 hover:bg-primary/10 hover:text-primary transition-all"
                                title={t("generate_new_token")}
                            >
                                <RefreshCw size={18} />
                            </Button>
                        </div>

                        <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("room_assignment")}</Label>
                            <Select
                                value={formData.roomId}
                                onValueChange={(val) => setFormData({ ...formData, roomId: val })}
                            >
                                <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all text-start">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-muted-foreground" />
                                        <SelectValue placeholder={t("select_room_placeholder")} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                    {rooms
                                        .filter((room) => {
                                            // 1. Filter by Study Field (Faculty)
                                            if (formData.studyFieldId) {
                                                const getCanonicalId = (roomData: any) => {
                                                    const rawVal = typeof roomData === 'string' ? roomData : (roomData?._ref || roomData?._id);
                                                    if (!rawVal) return null;
                                                    const found = studyFields.find((f: any) =>
                                                        f._id === rawVal || (f.code && f.code.toUpperCase() === rawVal.toUpperCase())
                                                    );
                                                    return found ? found._id : rawVal;
                                                };

                                                const canonicalRoomFieldId = getCanonicalId(room.studyField);
                                                const canonicalFormId = getCanonicalId(formData.studyFieldId);

                                                if (canonicalRoomFieldId !== canonicalFormId) return false;
                                            }

                                            // 2. Filter out rooms that already have a device (unless it's THIS device)
                                            const roomTaken = devices.some(d =>
                                                d.room?._id === room._id && d._id !== device?._id
                                            );

                                            return !roomTaken;
                                        })
                                        .map((room) => (
                                            <SelectItem key={room._id} value={room._id} className="rounded-xl text-start">
                                                {room.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50">
                            <div className="space-y-0.5 text-start">
                                <Label className="text-sm font-bold">{t("status")}</Label>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{t("active_device_processing_desc")}</p>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 pt-4 flex-col-reverse sm:flex-row gap-3">
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
