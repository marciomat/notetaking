"use client";

import { Toolbar } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { cn } from "@/lib/utils";
import type { AppOwner } from "@evolu/common";

interface AppLayoutProps {
  owner: AppOwner;
}

export function AppLayout({ owner }: AppLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useNoteStore();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar owner={owner} />

      {/* Main content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 ease-in-out md:relative md:z-0 md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            "top-12 md:top-0" // Account for toolbar on mobile
          )}
        >
          <Sidebar />
        </div>

        {/* Editor panel */}
        <EditorPanel />
      </div>
    </div>
  );
}
