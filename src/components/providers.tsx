"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

import { I18nProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <I18nProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AuthProvider>
                    {children}
                    <Toaster position="top-right" richColors closeButton />
                </AuthProvider>
            </ThemeProvider>
        </I18nProvider>
    );
}
