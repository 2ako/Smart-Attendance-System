"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellDot, CheckCheck, ClipboardList, X, Sparkles, UserCheck, UserX, Clock, MessageSquare, AlertTriangle, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    assignment?: {
        _id: string;
        title: string;
        type: string;
        dueDate: string;
        subject?: { name: string; code: string; level: string };
    };
}

export function NotificationBell() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const translateNotification = (n: Notification) => {
        let title = n.title;
        let message = n.message;

        if (n.type === "deadline_passed") {
            title = t("deadline_passed_notif");
            message = t("deadline_passed_msg", { title: n.assignment?.title || "" });
        } else if (n.type === "deadline_approaching") {
            title = t("deadline_approaching_notif");
            message = t("deadline_approaching_msg", { title: n.assignment?.title || "" });
        } else if (n.type === "attendance_present") {
            title = t("attendance_present_notif");
            message = t("attendance_present_msg", { subject: n.assignment?.subject?.name || "" });
        } else if (n.type === "attendance_absent") {
            title = t("attendance_absent_notif");
            message = t("attendance_absent_msg", { subject: n.assignment?.subject?.name || "" });
        } else if (n.type === "attendance_late") {
            title = t("attendance_late_notif");
            message = t("attendance_late_msg", { subject: n.assignment?.subject?.name || "" });
        } else if (n.type === "appeal_update") {
            title = t("justification_update_notif");
            const statusStr = n.message.toLowerCase();
            const status = statusStr.includes("approved") ? t("justification_approved") : statusStr.includes("rejected") ? t("justification_rejected") : t("justification_pending");
            message = t("justification_update_msg", { subject: n.assignment?.subject?.name || t("unassigned"), status });
        } else if (n.type === "new_justification") {
            title = t("new_justification_admin");
            const name = n.message.split(" ")[0] || "Student";
            message = t("new_justification_admin_msg", { name });
        } else if (n.type === "new_announcement") {
            title = t("new_announcement_notif");
            message = t("new_announcement_msg", { title: n.title });
        } else if (n.type === "new_assignment") {
            title = t("new_assignment_notif");
            message = t("new_assignment_msg", { title: n.assignment?.title || n.title });
        } else if (n.type === "graded") {
            title = t("assignment_graded_notif");
            message = t("assignment_graded_msg", { title: n.assignment?.title || n.title });
        }

        return { title, message };
    };

    const handleNotificationClick = async (n: Notification) => {
        // Mark as read if not already
        if (!n.isRead) {
            await markOneRead(n._id);
        }

        // Determine redirection URL
        let url = "";
        if ((n.type === "new_assignment" || n.type === "graded" || n.type === "appeal_update" || n.type === "deadline_approaching" || n.type === "deadline_passed") && n.assignment?._id) {
            url = `/student/assignments?assignmentId=${n.assignment._id}`;
        } else if (n.type.startsWith("attendance_")) {
            url = `/student/attendance`;
        } else if (n.type === "new_justification") {
            url = `/admin/justifications`;
        } else if (n.type === "new_announcement") {
            // Fix: Redirect students to their dedicated announcements page, admins to the admin page
            url = user?.role === "student" ? `/student/announcements` : `/admin/announcements`;
        }

        // Close dropdown
        setOpen(false);

        // Navigate if URL exists
        if (url) {
            router.push(url);
        }
    };

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all read:", err);
        }
    };

    const markOneRead = async (notificationId: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId }),
            });
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking read:", err);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);
        if (days > 0) return t("d_ago", { days });
        if (hrs > 0) return t("h_ago", { hrs });
        if (mins > 0) return t("m_ago", { mins });
        return t("just_now");
    };

    if (!user || (user.role !== "student" && user.role !== "admin")) return null;

    return (
        <div className="relative">
            {/* Bell Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
            >
                {unreadCount > 0
                    ? <BellDot size={18} className="text-primary animate-pulse" />
                    : <Bell size={18} />
                }
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center shadow-lg shadow-primary/30">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </Button>

            {/* Dropdown Panel */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    <div className="fixed inset-x-4 top-20 lg:absolute lg:inset-x-auto ltr:lg:left-0 rtl:lg:right-0 lg:top-10 z-50 w-auto lg:w-[320px] max-w-[400px] mx-auto lg:mx-0 rounded-3xl bg-card border border-border/60 shadow-2xl shadow-black/25 overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-top-3 lg:slide-in-from-top-2 duration-200 origin-top ltr:lg:origin-top-left rtl:lg:origin-top-right">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                    <Bell size={15} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-foreground leading-tight">{t("notifications")}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                        {unreadCount > 0 ? t("new_notifs", { count: unreadCount }) : t("all_caught_up")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={markAllRead}
                                        className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary gap-1 rounded-lg"
                                    >
                                        <CheckCheck size={11} />
                                        {t("read_all")}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                >
                                    <X size={13} />
                                </Button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="max-h-[340px] overflow-y-auto scrollbar-none">
                            {notifications.length === 0 ? (
                                /* ── Empty State ── */
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-5">
                                    <div className="relative">
                                        <div className="h-20 w-20 rounded-[28px] bg-muted/30 border border-border/40 flex items-center justify-center shadow-inner">
                                            <Bell size={32} className="text-muted-foreground/15" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                                            <Sparkles size={13} className="text-primary/50" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black text-foreground/40 tracking-tight">
                                            {t("no_notifs_yet")}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/35 font-medium leading-relaxed max-w-[200px]">
                                            {user?.role === "student" ? t("notif_student_empty") : t("notif_admin_empty")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t("listening_updates")}</span>
                                    </div>
                                </div>
                            ) : (
                                /* ── Notification Items ── */
                                <div className="divide-y divide-border/30">
                                    {notifications.map((n) => (
                                        <div
                                            key={n._id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "flex gap-3 px-4 py-3.5 transition-colors cursor-pointer",
                                                !n.isRead
                                                    ? "bg-primary/[0.04] hover:bg-primary/[0.07]"
                                                    : "hover:bg-muted/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                !n.isRead
                                                    ? "bg-primary/15 text-primary"
                                                    : "bg-muted/40 text-muted-foreground"
                                            )}>
                                                {n.type === "attendance_present" ? (
                                                    <UserCheck size={16} />
                                                ) : n.type === "attendance_absent" ? (
                                                    <UserX size={16} />
                                                ) : n.type === "attendance_late" ? (
                                                    <Clock size={16} />
                                                ) : n.type === "appeal_update" ? (
                                                    <MessageSquare size={16} />
                                                ) : n.type === "deadline_approaching" ? (
                                                    <Hourglass size={16} className="text-orange-500" />
                                                ) : n.type === "deadline_passed" ? (
                                                    <AlertTriangle size={16} className="text-red-500" />
                                                ) : n.type === "new_justification" ? (
                                                    <ClipboardList size={16} className="text-blue-500" />
                                                ) : n.type === "new_announcement" ? (
                                                    <Bell size={16} className="text-purple-500" />
                                                ) : (
                                                    <ClipboardList size={16} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {(() => {
                                                    const { title, message } = translateNotification(n);
                                                    return (
                                                        <>
                                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                                <p className={cn(
                                                                    "text-[11px] font-bold leading-snug line-clamp-1",
                                                                    !n.isRead ? "text-foreground" : "text-muted-foreground"
                                                                )}>
                                                                    {title}
                                                                </p>
                                                                {!n.isRead && (
                                                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-2 mb-1.5">
                                                                {message}
                                                            </p>
                                                        </>
                                                    );
                                                })()}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {n.assignment?.subject && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                                                            {n.assignment.subject.code}
                                                            {n.assignment.subject.level && ` • ${n.assignment.subject.level}`}
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-muted-foreground/35 font-bold uppercase tracking-widest">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer — only when there are notifications */}
                        {notifications.length > 0 && (
                            <div className="px-5 py-3 border-t border-border/40 bg-muted/10">
                                <p className="text-[9px] text-muted-foreground/25 font-bold uppercase tracking-widest text-center">
                                    {t("total_notifs", { count: notifications.length })}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
