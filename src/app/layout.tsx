// ============================================================
// Root Layout — App Shell (Server Component)
// ============================================================

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "EduSmart — University Smart Attendance",
  description:
    "A comprehensive smart attendance management system with biometric authentication, real-time tracking, and instant reports.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
