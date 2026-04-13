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
    FileText,
    Search,
    Filter,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Loader2,
    Calendar,
    User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";

export default function AdminJustificationsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [justifications, setJustifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchJustifications = async () => {
        try {
            const res = await fetch("/api/admin/justifications");
            if (res.ok) {
                const data = await res.json();
                setJustifications(data.justifications || []);
            }
        } catch (error) {
            console.error("Error loading justifications:", error);
            toast.error(t("failed_load_records"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchJustifications();
    }, [user?.id]);

    const handleUpdateStatus = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            const res = await fetch("/api/admin/justifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });

            if (res.ok) {
                toast.success(t("success"));
                fetchJustifications();
            } else {
                throw new Error(t("update_failed"));
            }
        } catch (error) {
            toast.error(t("error"));
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = justifications.filter(item => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.student?.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
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
                <div className="mb-10 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                            <FileText size={12} />
                            {t("governance_portal")}
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase">
                        {t("justification_manager")}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium max-w-2xl">
                        {t("justification_manager_desc")}
                    </p>
                </div>

                {/* ── Toolbar ────────────────────────────────────────── */}
                <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between animate-enter [animation-delay:100ms]">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
                        <Input
                            placeholder={t("search_justification_placeholder")}
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
                <Card className="rounded-[40px] border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden animate-enter [animation-delay:200ms]">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("student")}</TableHead>
                                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("document_info")}</TableHead>
                                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">{t("date")}</TableHead>
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
                                    <TableCell colSpan={5} className="py-32 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <FileText size={64} className="mb-4" />
                                            <p className="text-xl font-bold uppercase tracking-tight">{t("no_justifications_found")}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((item) => (
                                    <TableRow key={item._id} className="hover:bg-muted/20 border-border/50 transition-colors group">
                                        <TableCell className="py-6 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {item.student?.user?.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground group-hover:text-primary transition-colors">{item.student?.user?.name}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.student?.matricule}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6 px-8">
                                            <div className="max-w-[300px]">
                                                <p className="font-bold text-sm leading-tight">{item.title}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">"{item.description}"</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6 px-8">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                                <Calendar size={12} />
                                                {new Date(item.submissionDate).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6 px-8">
                                            {getStatusBadge(item.status)}
                                        </TableCell>
                                        <TableCell className="py-6 px-8 ltr:text-right rtl:text-left">
                                            <div className="flex items-center ltr:justify-end rtl:justify-start gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] gap-2"
                                                    onClick={() => window.open(item.fileUrl, '_blank')}
                                                >
                                                    <Download size={14} />
                                                    {t("view_doc_btn")}
                                                </Button>
                                                <div className="flex gap-1 ltr:border-l rtl:border-r border-border/50 ltr:pl-2 rtl:pr-2 ltr:ml-2 rtl:mr-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={updatingId === item._id || item.status === "approved"}
                                                        className={`h-10 w-10 rounded-xl hover:bg-green-500/10 hover:text-green-500 transition-all ${item.status === 'approved' ? 'text-green-500 bg-green-500/10' : ''}`}
                                                        onClick={() => handleUpdateStatus(item._id, "approved")}
                                                    >
                                                        {updatingId === item._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={updatingId === item._id || item.status === "rejected"}
                                                        className={`h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all ${item.status === 'rejected' ? 'text-destructive bg-destructive/10' : ''}`}
                                                        onClick={() => handleUpdateStatus(item._id, "rejected")}
                                                    >
                                                        {updatingId === item._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </main>
        </div>
    );
}
