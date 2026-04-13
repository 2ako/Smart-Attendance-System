import { Sidebar } from "@/components/layout/sidebar";

export default function PlaceholderPage({ title, role }: { title: string, role: "admin" | "student" | "professor" }) {
    return (
        <div className="flex min-h-screen bg-background selection:bg-primary/20">
            <Sidebar role={role} />
            <main className="lg:ml-[270px] flex-1 p-6 lg:p-12 pt-24 lg:pt-12 overflow-x-hidden flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase mb-4">
                    {title}
                </h1>
                <p className="text-muted-foreground font-medium">
                    This page is currently under construction.
                </p>
            </main>
        </div>
    );
}
