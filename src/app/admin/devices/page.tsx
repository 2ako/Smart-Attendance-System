// ============================================================
// /admin/devices/page.tsx — IoT Infrastructure Management
// ============================================================

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
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Cpu,
    Wifi,
    WifiOff,
    Terminal,
    MapPin,
    ShieldCheck,
    RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeviceDialog } from "@/components/admin/device-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePolling } from "@/hooks/use-polling";

import { useTranslation } from "@/lib/i18n/context";

export default function IoTDevicesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [devices, setDevices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog States
    const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<any>(null);

    // Real-time polling for device status
    const { data: polledData } = usePolling({ url: "/api/admin/devices", interval: 5000 });

    useEffect(() => {
        if (polledData) {
            setDevices((polledData as any).devices || []);
            setIsLoading(false);
        }
    }, [polledData]);

    const handleAddDevice = () => {
        setSelectedDevice(null);
        setDeviceDialogOpen(true);
    };

    const handleEditDevice = (device: any) => {
        setSelectedDevice(device);
        setDeviceDialogOpen(true);
    };

    const handleDeleteClick = (device: any) => {
        setSelectedDevice(device);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedDevice) return;
        try {
            const res = await fetch(`/api/admin/devices?id=${selectedDevice._id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(t("success"));
                setDeleteDialogOpen(false);
            } else {
                throw new Error(data.message || t("error"));
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const isOnline = (lastSeen: string) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
        return diffInMinutes < 5; // Online if seen in last 5 minutes
    };

    const filteredDevices = devices.filter(device =>
        device.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.room?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: devices.length,
        active: devices.filter(d => d.isActive).length,
        online: devices.filter(d => isOnline(d.lastSeen)).length,
        hybrid: devices.filter(d => d.type === 'hybrid').length,
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <Cpu size={12} />
                            {t("hardware_mesh")}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">{t("iot_infrastructure")}</h1>
                            <p className="text-muted-foreground font-medium max-w-2xl">
                                {t("devices_manager_desc")}
                            </p>
                        </div>
                        <Button onClick={handleAddDevice} className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.05] active:scale-[0.95] gap-2">
                            <Plus size={16} strokeWidth={3} />
                            {t("register_device")}
                        </Button>
                    </div>
                </div>

                {/* ── Network Stats ─────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-enter [animation-delay:100ms]">
                    <Card className="rounded-3xl border-border bg-card shadow-sm group hover:border-primary/50 transition-all">
                        <CardHeader className="p-6 pb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{t("nodes_in_mesh")}</p>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0 flex items-center justify-between">
                            <p className="text-3xl font-black">{stats.total}</p>
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                <Cpu size={20} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-border bg-card shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("authorized_terminals")}</p>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0 flex items-center justify-between">
                            <p className="text-3xl font-black text-foreground">{stats.active}</p>
                            <div className="h-10 w-10 rounded-xl bg-orange-500/5 flex items-center justify-center text-orange-500">
                                <ShieldCheck size={20} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-border bg-card shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("pulse_status")} ({t("online")})</p>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0 flex items-center justify-between">
                            <p className="text-3xl font-black text-green-500">{stats.online}</p>
                            <div className="h-10 w-10 rounded-xl bg-green-500/5 flex items-center justify-center text-green-500 relative">
                                <Wifi size={20} />
                                <span className="absolute top-2 ltr:right-2 rtl:left-2 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-border bg-card shadow-sm">
                        <CardHeader className="p-6 pb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("system_health")}</p>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0 flex items-center justify-between">
                            <p className="text-3xl font-black text-foreground">100%</p>
                            <div className="h-10 w-10 rounded-xl bg-blue-500/5 flex items-center justify-center text-blue-500">
                                <Terminal size={20} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Device Management Console ─────────────────────── */}
                <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden animate-enter [animation-delay:200ms]">
                    <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Terminal size={24} className="text-primary" />
                                {t("hardware_registry")}
                            </CardTitle>
                            <div className="relative max-w-md w-full group">
                                <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <Input
                                    placeholder={t("search")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-12 ltr:pl-12 rtl:pr-12 bg-muted/50 border-none rounded-2xl focus:bg-background transition-all"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest py-6 px-8">#</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">{t("hardware_identity")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">{t("location")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">{t("status")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">{t("health")}</TableHead>
                                        <TableHead className="ltr:text-right rtl:text-left py-6 ltr:pr-8 rtl:pl-8 text-[10px] font-black uppercase tracking-widest">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="p-8"><TableSkeleton /></TableCell>
                                        </TableRow>
                                    ) : filteredDevices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                                    <Cpu size={48} className="text-muted-foreground" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_devices_found")}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDevices.map((device, idx) => {
                                            const online = isOnline(device.lastSeen);
                                            return (
                                                <TableRow key={device._id} className="border-border group hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-mono text-[10px] font-bold text-muted-foreground px-8">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-10 w-10 rounded-xl ${device.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} flex items-center justify-center transition-colors`}>
                                                                <Cpu size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm text-foreground uppercase tracking-tight">{device.deviceId}</p>
                                                                <p className="text-[10px] font-bold font-mono text-muted-foreground truncate max-w-[120px]">
                                                                    {device.deviceToken.slice(0, 8)}••••••••
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} className="text-muted-foreground" />
                                                            <span className="font-bold text-sm text-foreground/80">{device.room?.name || t("unassigned")}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 ${device.isActive ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-red-500/5 text-red-500 border-red-500/10'
                                                            }`}>
                                                            {device.isActive ? t("authorized") : t("disabled")}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            {online ? (
                                                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px] uppercase tracking-widest">
                                                                    <Wifi size={14} />
                                                                    {t("pulse")}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
                                                                    <WifiOff size={14} />
                                                                    {t("gone")}
                                                                </div>
                                                            )}
                                                            <p className="text-[9px] font-medium text-muted-foreground mt-1">
                                                                {device.lastSeen
                                                                    ? new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : t("never_seen")}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="ltr:text-right rtl:text-left ltr:pr-8 rtl:pl-8">
                                                        <div className="flex items-center justify-center ltr:md:justify-end rtl:md:justify-start gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditDevice(device)}
                                                                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                            >
                                                                <Pencil size={18} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteClick(device)}
                                                                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                                            >
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="lg:hidden p-4 space-y-4">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-44 bg-muted/20 animate-pulse rounded-[2rem]" />
                                ))
                            ) : filteredDevices.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <Cpu size={48} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_results")}</p>
                                </div>
                            ) : (
                                filteredDevices.map((device) => {
                                    const online = isOnline(device.lastSeen);
                                    return (
                                        <div key={device._id} className="p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-4 relative overflow-hidden group">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-14 w-14 rounded-2xl ${device.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} flex items-center justify-center shadow-inner`}>
                                                    <Cpu size={24} />
                                                </div>
                                                <div className="flex-1 pr-12 rtl:pl-12">
                                                    <h3 className="font-extrabold text-lg text-foreground uppercase tracking-tight line-clamp-1">{device.deviceId}</h3>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{online ? t("online") : t("offline")}</p>
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 ltr:right-4 rtl:left-4 flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditDevice(device)}
                                                        className="h-9 w-9 rounded-xl bg-muted/20 hover:bg-primary/10 hover:text-primary transition-all"
                                                    >
                                                        <Pencil size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(device)}
                                                        className="h-9 w-9 rounded-xl bg-muted/20 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <div className="p-3 rounded-2xl bg-muted/10 border border-border/50">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("location")}</p>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={10} className="text-primary" />
                                                        <p className="text-[11px] font-bold text-foreground truncate">{device.room?.name || t("unassigned")}</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/10 border border-border/50 text-center flex flex-col justify-center">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("last_seen")}</p>
                                                    <p className="text-[10px] font-bold text-foreground">
                                                        {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Dialogs */}
            <DeviceDialog
                open={deviceDialogOpen}
                onOpenChange={setDeviceDialogOpen}
                device={selectedDevice}
                onSuccess={() => { }} // Polling will pick it up
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("decommission_terminal")}
                description={t("decommission_description")}
            />
        </div>
    );
}
