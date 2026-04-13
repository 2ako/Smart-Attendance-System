// ============================================================
// Sidebar Component — Shared sidebar for all dashboards
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    MapPin,
    Cpu,
    CalendarDays,
    ClipboardList,
    BarChart3,
    Settings,
    LogOut,
    GraduationCap,
    History,
    BookOpenCheck,
    Menu,
    UserCheck,
    FileText,
    Megaphone,
    DoorClosed,
    Shield
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";

import { useTranslation } from "@/lib/i18n/context";

interface NavItem {
    label: string;
    key: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
    requireSuperAdmin?: boolean;
}

const studentNav: NavItem[] = [
    { label: "Dashboard", key: "dashboard", href: "/student", icon: <LayoutDashboard size={20} /> },
    { label: "Announcements", key: "announcements", href: "/student/announcements", icon: <Megaphone size={20} /> },
    { label: "Courses", key: "courses", href: "/student/courses", icon: <BookOpen size={20} /> },
    { label: "Attendance History", key: "history", href: "/student/attendance", icon: <CalendarDays size={20} /> },
    { label: "Assignments", key: "assignments", href: "/student/assignments", icon: <ClipboardList size={20} /> },
    { label: "Absence Justification", key: "justifications", href: "/student/justifications", icon: <FileText size={20} /> },
    { label: "Settings", key: "settings", href: "/student/settings", icon: <Settings size={20} /> },
];

const professorNav: NavItem[] = [
    { label: "Dashboard", key: "dashboard", href: "/prof", icon: <LayoutDashboard size={20} /> },
    { label: "My Classes", key: "my_classes", href: "/prof/classes", icon: <BookOpenCheck size={20} /> },
    { label: "History", key: "history", href: "/prof/sessions-history", icon: <History size={20} /> },
    { label: "Settings", key: "settings", href: "/prof/settings", icon: <Settings size={20} /> },
];

const facultyAdminNav: NavItem[] = [
    { label: "Faculty Dashboard", key: "faculty_dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "Announcements", key: "announcements", href: "/admin/announcements", icon: <Megaphone size={20} /> },
    { label: "Students", key: "students", href: "/admin/students", icon: <Users size={20} /> },
    { label: "Professors", key: "professors", href: "/admin/professors", icon: <GraduationCap size={20} /> },
    { label: "Courses & Subjects", key: "subjects", href: "/admin/courses", icon: <BookOpen size={20} /> },
    { label: "Rooms", key: "rooms", href: "/admin/rooms", icon: <DoorClosed size={20} /> },
    { label: "IoT Devices", key: "devices", href: "/admin/devices", icon: <Cpu size={20} /> },
    { label: "Absences", key: "absences", href: "/admin/absences", icon: <History size={20} /> },
    { label: "Absence Notes", key: "justifications", href: "/admin/justifications", icon: <FileText size={20} />, badge: 0 },
    { label: "Settings", key: "settings", href: "/admin/settings", icon: <Settings size={20} /> },
];

const superAdminNav: NavItem[] = [
    { label: "University Overview", key: "overview", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "Study Fields", key: "study_fields", href: "/admin/study-fields", icon: <GraduationCap size={20} /> },
    { label: "Announcements", key: "announcements", href: "/admin/announcements", icon: <Megaphone size={20} /> },
    { label: "User Access", key: "user_access", href: "/admin/users", icon: <Shield size={20} /> },
    { label: "Settings", key: "settings", href: "/admin/settings", icon: <Settings size={20} /> },
];

interface SidebarProps {
    role: "student" | "professor" | "admin";
}

function SidebarContent({ role, pathname, user, logout }: any) {
    const { t } = useTranslation();
    let navItems = studentNav;
    if (role === "professor") navItems = professorNav;
    if (role === "admin") navItems = user?.studyField ? facultyAdminNav : superAdminNav;

    const portalLabel =
        role === "student" ? t("student_portal") : role === "professor" ? t("prof_portal") : user?.studyField ? t("admin_portal") : t("director_portal");

    return (
        <div className="flex h-full flex-col">
            {/* ── Logo & Brand ────────────────────────────────────────── */}
            <div className="px-6 py-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3.5 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                        <GraduationCap size={22} className="text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold tracking-tight text-foreground leading-tight">
                            EduSmart
                        </h1>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
                            {portalLabel}
                        </p>
                    </div>
                </Link>
                <div className="flex items-center gap-1">
                    {(role === "student" || role === "admin") && <NotificationBell />}
                    <ThemeToggle />
                </div>
            </div>

            {/* ── Navigation ───────────────────────────────────────── */}
            <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto pt-2 scrollbar-none">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {t("main_menu")}
                </p>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== `/${role === "professor" ? "prof" : role}` && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-300",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                            )}
                        >
                            <span className={cn(
                                "transition-colors duration-300",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                                {item.icon}
                            </span>
                            <span className="flex-1">{t(item.key)}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-black shadow-sm",
                                    isActive ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                            {isActive && (
                                <span className="absolute ltr:left-[-4px] rtl:right-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full blur-[2px]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ── User Profile & Footer ────────────────────────────────── */}
            <div className="p-4 mt-auto">
                <div className="rounded-2xl bg-sidebar-accent/50 p-3 border border-sidebar-border/50">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20 p-0.5">
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                                {user?.name || t("user_account")}
                            </p>
                            <p className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                                {role === "admin" ? t("admin") : role === "professor" ? t("prof") : t("student")}
                            </p>
                        </div>
                    </div>
                    <Separator className="bg-sidebar-border/50 mb-3" />
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full rounded-xl py-2 text-xs font-semibold text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                    >
                        <LogOut size={14} />
                        {t("sign_out")}
                    </button>
                </div>
                <p className="mt-4 text-center text-[10px] text-muted-foreground/30 font-medium">
                    EduSmart v2.0 • 2026
                </p>
            </div>
        </div>
    );
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const { lang } = useTranslation();
    const { user, logout } = useAuth();
    const [open, setOpen] = React.useState(false);

    return (
        <>
            {/* Mobile Header & Trigger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <GraduationCap size={18} className="text-primary-foreground" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight">EduSmart</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {(role === "student" || role === "admin") && <NotificationBell />}
                    <ThemeToggle />
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                                <Menu size={24} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side={lang === "ar" ? "right" : "left"} className="p-0 w-[270px] ltr:border-r rtl:border-l border-sidebar-border bg-sidebar-background">
                            <div className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                                <SheetDescription>Access dashboard routes and user settings</SheetDescription>
                            </div>
                            <SidebarContent role={role} pathname={pathname} user={user} logout={logout} />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Desktop Fixed Sidebar */}
            <aside className="fixed ltr:left-0 rtl:right-0 top-0 z-40 hidden lg:flex h-screen w-[270px] flex-col ltr:border-r rtl:border-l border-sidebar-border bg-sidebar-background/95 backdrop-blur-xl transition-all duration-300">
                <SidebarContent role={role} pathname={pathname} user={user} logout={logout} />
            </aside>
        </>
    );
}
