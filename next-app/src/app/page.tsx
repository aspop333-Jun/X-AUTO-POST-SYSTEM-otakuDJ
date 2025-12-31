"use client";

import { useState } from "react";
import { DropZone } from "@/components/dashboard/DropZone";
import { QueueList } from "@/components/dashboard/QueueList";
import { EventInfoPanel } from "@/components/dashboard/EventInfoPanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import EditorPage from "@/components/editor/EditorPage";
import { useAppStore } from "@/store/useAppStore";
import { useHydration } from "@/hooks/useHydration";
import { Loader2, Settings } from "lucide-react";

export default function Home() {
  // All hooks must be called before any conditional returns
  const hydrated = useHydration();
  const { currentStep, settings, postQueue } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Prevent hydration mismatch by showing loading state until client is ready
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (currentStep === 2) {
    return <EditorPage />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-[image:var(--accent-gradient)]">
            Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            イベント写真を簡単に投稿準備
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`relative flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-medium ${!settings.makeWebhookUrl ? 'ring-2 ring-yellow-500/50' : ''}`}
            title="設定"
          >
            <Settings className="w-4 h-4" />
            設定
            {!settings.makeWebhookUrl && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Flow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Event Info */}
          <section>
            <EventInfoPanel />
          </section>

          {/* Step 2: Photo Upload */}
          <section>
            <DropZone />
          </section>
        </div>

        {/* Right Column: Queue */}
        <div className="lg:col-span-1">
          <section className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/5 h-full">
            <h2 className="text-lg font-semibold mb-6 flex items-center justify-between">
              <span>投稿キュー</span>
              <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded text-[var(--accent-primary)]">
                {postQueue.length} / 10
              </span>
            </h2>
            <QueueList />
          </section>
        </div>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

