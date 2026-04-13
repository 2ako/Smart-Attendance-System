// ============================================================
// Student Courses Page — Personal curriculum view
// ============================================================

"use client";

import { useEffect, useState } from "react";
import {
    BookOpen,
    Clock,
    MapPin,
    User,
    Calendar,
    Search,
    Filter,
    BookMarked
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/hooks/use-auth";


interface Course {
    _id: string;
    "subjectDetails": {
        "name": string;
        "code": string;
        "semester": number;
        "creditHours": number;
        "degree": string;
        "level": string;
        "type"?: string;
        "studyField": string;
        "specialty": string;
    };
    professor?: {
        user?: {
            name: string;
        };
    };
    scheduleInfo?: {
        day: string;
        startTime: string;
        endTime: string;
        room: string;
    };
}

export default function StudentCoursesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function loadCourses() {
            if (!user?.id) return;
            try {
                const res = await fetch("/api/student/courses");
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data.courses || []);
                }
            } catch (error) {
                console.error("Error loading courses:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadCourses();
    }, [user?.id]);

    const filteredCourses = courses.filter(course =>
        course.subjectDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.subjectDetails?.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Sidebar role="student" />

            <main className="ltr:lg:ml-[270px] rtl:lg:mr-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden">
                <div className="space-y-10 animate-enter">
                    {/* Header section */}
                    <div className="flex flex-col gap-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                            <BookMarked className="text-primary" size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("my_curriculum")}</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                            {t("courses")}
                        </h1>
                        <p className="text-muted-foreground font-medium max-w-2xl">
                            {t("view_manage_courses")}
                        </p>
                    </div>

                    {/* Search & Stats */}
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-center text-start">
                        <div className="relative w-full md:w-96 group text-start">
                            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors text-start" />
                            <Input
                                placeholder={t("search_course_placeholder")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ltr:pl-11 rtl:pr-11 h-12 rounded-2xl bg-muted/30 border-none focus:bg-background transition-all font-medium text-start"
                            />
                        </div>
                        <div className="flex gap-4 text-start">
                            <div className="bg-card px-6 py-3 rounded-2xl border border-border/50 text-center shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("total_courses")}</p>
                                <p className="text-xl font-black text-foreground">{courses.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Course List */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-start">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-[280px] w-full rounded-3xl" />
                            ))}
                        </div>
                    ) : filteredCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-start">
                            {filteredCourses.map((course) => (
                                <Card key={course._id} className="rounded-3xl border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/50 transition-all group overflow-hidden flex flex-col text-start">
                                    <CardHeader className="p-6 border-b border-border/50 bg-gradient-to-br from-muted/50 to-transparent flex-1 text-start">
                                        <div className="flex justify-between items-start mb-4 text-start">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <BookOpen size={24} />
                                            </div>
                                            <Badge variant="outline" className="font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary bg-primary/5">
                                                {t("credits")} • {course.subjectDetails?.creditHours || 0}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground line-clamp-2 leading-tight text-start">
                                            {course.subjectDetails?.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-bold text-primary max-w-[80%] uppercase tracking-widest mt-2 flex items-center gap-2 text-start">
                                            {course.subjectDetails?.code}
                                            <span className="text-muted-foreground/40">•</span>
                                            <span className="text-muted-foreground">{t("semester")} {course.subjectDetails?.semester || 1}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4 bg-card text-start">
                                        <div className="flex items-center gap-3 text-sm font-medium text-foreground text-start">
                                            <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                                                <User size={14} />
                                            </div>
                                            <span className="truncate">
                                                {course.professor?.user?.name || <span className="text-muted-foreground italic text-xs uppercase font-bold tracking-widest">{t("unassigned")}</span>}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-start">
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 p-2.5 rounded-xl text-start">
                                                <Clock size={14} className="text-primary" />
                                                <span className="truncate">
                                                    {course.scheduleInfo?.startTime ? `${t(course.scheduleInfo.day.toLowerCase())} ${course.scheduleInfo.startTime}` : t("not_scheduled_yet")}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 p-2.5 rounded-xl text-start">
                                                <MapPin size={14} className="text-primary" />
                                                <span className="truncate">
                                                    {typeof course.scheduleInfo?.room === 'string' ? course.scheduleInfo.room : (course.scheduleInfo?.room as any)?.name || course.scheduleInfo?.room || t("tbd")}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-border/50 bg-muted/10 animate-pulse text-center">
                            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{t("no_courses_available")}</h3>
                            <p className="text-muted-foreground font-medium text-sm mt-1">
                                {searchQuery ? t("adjust_filters") : t("enrolled_none")}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
