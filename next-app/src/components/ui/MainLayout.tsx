"use client";

import { Sidebar } from "@/components/ui/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
