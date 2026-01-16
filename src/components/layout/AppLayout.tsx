"use client";

import { Toolbar } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import type { AppOwner } from "@evolu/common";

interface AppLayoutProps {
  owner: AppOwner;
}

export function AppLayout({ owner }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar owner={owner} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Editor panel */}
        <EditorPanel />
      </div>
    </div>
  );
}
