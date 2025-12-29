"use client";

import { useAppStore } from "@/store/useAppStore";
import { useHydration } from "@/hooks/useHydration";
import { cn } from "@/utils/cn";
import { LayoutDashboard, PenTool, Settings, Image as ImageIcon } from "lucide-react";

export function Sidebar() {
    const hydrated = useHydration();
    const { currentStep, setStep } = useAppStore();

    // Use default step if not hydrated to prevent mismatch
    const activeStep = hydrated ? currentStep : 1;

    const navItems = [
        { label: "Dashboard", icon: LayoutDashboard, step: 1 },
        { label: "Editor", icon: PenTool, step: 2 },
    ];

    return (
        <aside className="w-20 md:w-64 border-r border-white/10 bg-[var(--bg-secondary)] flex flex-col h-screen sticky top-0">
            <div className="p-6 flex items-center justify-center md:justify-start gap-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <ImageIcon className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-lg hidden md:block text-transparent bg-clip-text bg-[image:var(--accent-gradient)]">
                    X-AutoPost
                </span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setStep(item.step)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                            activeStep === item.step
                                ? "bg-[image:var(--accent-gradient)] text-white shadow-lg shadow-indigo-500/20"
                                : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium hidden md:block">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-all">
                    <Settings className="w-5 h-5 shrink-0" />
                    <span className="font-medium hidden md:block">Settings</span>
                </button>
            </div>
        </aside>
    );
}
