// ============================================================
// /admin/rooms/page.tsx — Room Allocation Management
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
    MapPin,
    Building,
    Users,
    Layers,
    LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoomDialog } from "@/components/admin/room-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useTranslation } from "@/lib/i18n/context";

export default function RoomAllocationPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [rooms, setRooms] = useState<any[]>([]);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog States
    const [roomDialogOpen, setRoomDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    async function loadRooms() {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/rooms");
            const data = await res.json();
            if (res.ok) {
                setRooms(data.rooms || []);
            }
        } catch (error) {
            console.error("Error loading rooms:", error);
            toast.error(t("error"));
        } finally {
            setIsLoading(false);
        }
    }

    async function loadStudyFields() {
        try {
            const res = await fetch("/api/admin/study-fields");
            if (res.ok) {
                const data = await res.json();
                setStudyFields(data.studyFields || []);
            }
        } catch (error) {
            console.error("Error loading study fields:", error);
        }
    }

    useEffect(() => {
        loadRooms();
        loadStudyFields();
    }, []);

    const getStudyFieldName = (studyFieldData: any) => {
        if (!studyFieldData) return t("all");

        const idOrCode = typeof studyFieldData === 'string' ? studyFieldData : (studyFieldData._ref || studyFieldData._id);
        if (!idOrCode) return t("all");

        const found = studyFields.find((f: any) =>
            f._id === idOrCode ||
            (f.code && f.code.toUpperCase() === idOrCode.toUpperCase())
        );

        return found ? found.name : idOrCode;
    };

    const handleAddRoom = () => {
        setSelectedRoom(null);
        setRoomDialogOpen(true);
    };

    const handleEditRoom = (room: any) => {
        setSelectedRoom(room);
        setRoomDialogOpen(true);
    };

    const handleDeleteClick = (room: any) => {
        setSelectedRoom(room);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedRoom) return;
        try {
            const res = await fetch(`/api/admin/rooms?id=${selectedRoom._id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(t("success"));
                loadRooms();
                setDeleteDialogOpen(false);
            } else {
                throw new Error(data.message || "Failed to delete room");
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filteredRooms = rooms.filter(room => {
        const query = searchTerm.toLowerCase();
        const deptName = getStudyFieldName(room.studyField).toLowerCase();

        return room.name?.toLowerCase().includes(query) ||
            deptName.includes(query);
    });

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <MapPin size={12} />
                            {t("governance_console")}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">{t("room_allocation")}</h1>
                            <p className="text-muted-foreground font-medium max-w-2xl">
                                {t("rooms_manager_desc")}
                            </p>
                        </div>
                        <Button onClick={handleAddRoom} className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.05] active:scale-[0.95] gap-2">
                            <Plus size={16} strokeWidth={3} />
                            {t("add_new")}
                        </Button>
                    </div>
                </div>

                {/* ── Stats Summary ─────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-enter [animation-delay:100ms]">
                    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("total_rooms")}</p>
                        <p className="text-3xl font-black text-primary">{rooms.length}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("total_capacity")}</p>
                        <p className="text-3xl font-black text-foreground">{rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("status")}</p>
                        <p className="text-3xl font-black text-green-500 flex items-center gap-2">
                            {t("active")}
                            <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        </p>
                    </div>
                    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("system_health")}</p>
                        <p className="text-3xl font-black text-foreground">100%</p>
                    </div>
                </div>

                {/* ── Main content ───────────────────────────────────── */}
                <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden animate-enter [animation-delay:200ms]">
                    <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <LayoutGrid size={24} className="text-primary" />
                                {t("room_directory")}
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
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">{t("room_details")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">{t("field")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">{t("floor")}</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">{t("capacity")}</TableHead>
                                        <TableHead className="ltr:text-right rtl:text-left py-6 pr-8 text-[10px] font-black uppercase tracking-widest">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="p-8"><TableSkeleton /></TableCell>
                                        </TableRow>
                                    ) : filteredRooms.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                                    <MapPin size={48} className="text-muted-foreground" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_rooms_found")}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRooms.map((room, idx) => (
                                            <TableRow key={room._id} className="border-border group hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-mono text-[10px] font-bold text-muted-foreground px-8">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            {room.name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-foreground uppercase tracking-tight">{room.name}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("room_details")}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10">
                                                        <span className="font-bold text-[10px] text-primary uppercase tracking-widest">
                                                            {getStudyFieldName(room.studyField)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground">
                                                    {room.floor !== undefined ? `F${room.floor}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="rounded-lg h-7 px-3 bg-primary/5 text-primary border-primary/10 font-bold">
                                                        {room.capacity || "—"} {t("seats")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="ltr:text-right rtl:text-left pr-8">
                                                    <div className="flex items-center justify-center ltr:md:justify-end rtl:md:justify-start gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditRoom(room)}
                                                            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                        >
                                                            <Pencil size={18} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteClick(room)}
                                                            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="lg:hidden p-4 space-y-4">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-[2rem]" />
                                ))
                            ) : filteredRooms.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <MapPin size={48} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">{t("no_results")}</p>
                                </div>
                            ) : (
                                filteredRooms.map((room) => (
                                    <div key={room._id} className="p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-4 relative overflow-hidden group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                                                {room.name?.[0]}
                                            </div>
                                            <div className="flex-1 pr-12 rtl:pl-12">
                                                <h3 className="font-extrabold text-lg text-foreground uppercase tracking-tight line-clamp-1">{room.name}</h3>
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t("academic_room")}</p>
                                            </div>
                                            <div className="absolute top-4 ltr:right-4 rtl:left-4 flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditRoom(room)}
                                                    className="h-9 w-9 rounded-xl bg-muted/20 hover:bg-primary/10 hover:text-primary transition-all"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(room)}
                                                    className="h-9 w-9 rounded-xl bg-muted/20 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-2xl bg-muted/10 border border-border/50 flex flex-col items-center justify-center text-center">
                                                <Building size={14} className="text-muted-foreground mb-1" />
                                                <p className="text-[10px] font-black text-foreground uppercase truncate w-full">{getStudyFieldName(room.studyField)}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{t("field")}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-muted/10 border border-border/50 flex flex-col items-center justify-center text-center">
                                                <Layers size={14} className="text-muted-foreground mb-1" />
                                                <p className="text-xs font-black text-foreground">F{room.floor || 0}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{t("floor")}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center">
                                                <Users size={14} className="text-primary mb-1" />
                                                <p className="text-xs font-black text-primary">{room.capacity || 0}</p>
                                                <p className="text-[8px] font-bold text-primary/60 uppercase tracking-widest">{t("capacity")}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Dialogs */}
            <RoomDialog
                open={roomDialogOpen}
                onOpenChange={setRoomDialogOpen}
                room={selectedRoom}
                onSuccess={loadRooms}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={t("delete_room")}
                description={t("delete_room_description")}
            />
        </div>
    );
}
