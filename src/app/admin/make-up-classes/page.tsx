"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    CalendarDays,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Calendar,
    User,
    BookOpen,
    MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { CreateMakeUpSessionDialog } from "@/components/admin/create-makeup-session-dialog";

export default function AdminMakeUpClassesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    
    // Dialog state for approval
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/make-up-requests");
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Error loading make-up requests:", error);
            toast.error(t("failed_load_records"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchRequests();
    }, [user?.id]);

    const handleReject = async (id: string) => {
        setUpdatingId(id);
        try {
            const res = await fetch("/api/admin/make-up-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "rejected" }),
            });

            if (res.ok) {
                toast.success(t("success"));
                fetchRequests();
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            toast.error(t("error"));
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = requests.filter(item => {
        const matchesSearch =
            item.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.professor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5"><CheckCircle2 size={12} /> {t("approved_status")}</Badge>;
            case "rejected":
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5"><XCircle size={12} /> {t("rejected_status")}</Badge>;
            default:
                return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5"><Clock size={12} /> {t("pending_status")}</Badge>;
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar role="admin" />
            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10 animate-enter text-start">
                    <div className="flex items-center gap-3 mb-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary text-start">
                            <CalendarDays size={12} />
                            {t("makeup_classes")}
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase text-start">
                        {t("makeup_classes")}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium max-w-2xl text-start">
                        {t("manage_makeup_desc") || "Manage and approve professor requests for make-up sessions and assign rooms."}
                    </p>
                </div>

                {/* ── Toolbar ────────────────────────────────────────── */}
                <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between animate-enter [animation-delay:100ms] text-start">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
                        <Input
                            placeholder={t("search_placeholder") || "Search by professor or subject..."}
                            className="ltr:pl-12 rtl:pr-12 h-14 rounded-2xl bg-card border-none shadow-sm focus-visible:ring-primary/20 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto text-start">
                        <div className="flex bg-card p-1 rounded-xl shadow-sm border border-border/50 text-start">
                            {["all", "pending", "approved", "rejected"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t(`${s}_status`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Table Container ─────────────────────────────── */}
                <Card className="rounded-[40px] border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden animate-enter [animation-delay:200ms] text-start">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("professor")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("makeup_subject")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("makeup_date")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("status")}</TableHead>
                                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest ltr:text-right rtl:text-left">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={5} className="py-12 border-border/10">
                                                <div className="h-8 bg-muted/20 rounded-xl" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-32 text-center text-start">
                                            <div className="flex flex-col items-center justify-center opacity-20 text-start">
                                                <CalendarDays size={64} className="mb-4" />
                                                <p className="text-xl font-bold uppercase tracking-tight">{t("no_records_found")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((item) => (
                                        <TableRow key={item._id} className="hover:bg-muted/20 border-border/50 transition-colors group">
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-4 text-start">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-foreground group-hover:text-primary transition-colors text-start">{item.professor?.name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-start">{item.professor?.specialty || t("professor")}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <div className="max-w-[250px] text-start">
                                                    <p className="font-bold text-sm leading-tight text-start">{item.subject?.name}</p>
                                                    <Badge variant="outline" className="text-[10px] mt-1 border-primary/20 bg-primary/5 text-primary text-start">
                                                        {t(`format_${(item.type || "lecture").toLowerCase()}`)}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <div className="space-y-1 text-start">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase text-start">
                                                        <Calendar size={12} />
                                                        {item.requestedDate}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase text-start">
                                                        <Clock size={12} />
                                                        {item.requestedTime}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell className="py-6 px-8 ltr:text-right rtl:text-left">
                                                <div className="flex items-center ltr:justify-end rtl:justify-start gap-2 text-start">
                                                    {item.status === "pending" && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                                                                onClick={() => {
                                                                    setSelectedRequest(item);
                                                                    setIsApproveDialogOpen(true);
                                                                }}
                                                            >
                                                                <CheckCircle2 size={14} />
                                                                {t("approve")}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={updatingId === item._id}
                                                                className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                                                                onClick={() => handleReject(item._id)}
                                                            >
                                                                {updatingId === item._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                                            </Button>
                                                        </>
                                                    )}
                                                    {item.status === "approved" && item.room && (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/5 border border-green-500/10 text-[10px] font-bold text-green-600 uppercase text-start">
                                                            <MapPin size={12} />
                                                            {item.room?.name || item.room}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* ── Approval Dialog ─────────────────────────────── */}
                {selectedRequest && (
                    <CreateMakeUpSessionDialog
                        open={isApproveDialogOpen}
                        onOpenChange={setIsApproveDialogOpen}
                        request={selectedRequest}
                        onSuccess={() => {
                            setIsApproveDialogOpen(false);
                            fetchRequests();
                        }}
                    />
                )}
            </main>
        </div>
    );
}
