"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { PanelLeft } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { cn } from "@/lib/utils";
import type { AppOwner } from "@evolu/common";
import { createSettingsQuery } from "@/lib/evolu";
import { useQuery } from "@evolu/react";
import { useCurrentEvolu, useTabEvoluHook } from "@/components/app/TabContent";

interface AppLayoutProps {
  owner: AppOwner;
}

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 600;
const COLLAPSE_WIDTH = 56; // Same as the left padding when collapsed

export function AppLayout({ owner }: AppLayoutProps) {
  const evoluInstance = useCurrentEvolu();
  const { insert, update } = useTabEvoluHook();
  
  // Create queries using the current tab's evolu instance
  const settingsQuery = useMemo(() => createSettingsQuery(evoluInstance), [evoluInstance]);
  const settings = useQuery(settingsQuery);
  
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedNoteId,
    setSelectedNoteId,
  } = useNoteStore();

  const [isResizing, setIsResizing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [creatingSettings, setCreatingSettings] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // On mount: restore last seen note from settings
  useEffect(() => {
    if (initialLoadDone) return;

    const settingsRow = settings[0];
    if (settingsRow?.lastSeenNoteId && !selectedNoteId) {
      setSelectedNoteId(settingsRow.lastSeenNoteId);
    }
    setInitialLoadDone(true);
  }, [settings, selectedNoteId, setSelectedNoteId, initialLoadDone]);

  // Update settings when selected note changes
  useEffect(() => {
    if (!initialLoadDone || !selectedNoteId) return;

    const settingsRow = settings[0];

    if (settingsRow) {
      // Update existing settings
      if (settingsRow.lastSeenNoteId !== selectedNoteId) {
        update("settings", {
          id: settingsRow.id,
          lastSeenNoteId: selectedNoteId,
        });
      }
    } else if (!creatingSettings) {
      // Create settings row if it doesn't exist (Evolu will generate the ID)
      setCreatingSettings(true);
      insert("settings", {
        lastSeenNoteId: selectedNoteId,
      });
    }
  }, [selectedNoteId, settings, update, insert, initialLoadDone, creatingSettings]);

  // Reset creatingSettings flag once settings row appears
  useEffect(() => {
    if (creatingSettings && settings[0]) {
      setCreatingSettings(false);
    }
  }, [creatingSettings, settings]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;

      // If dragged to or below collapse width, transition to collapsed state
      if (newWidth <= COLLAPSE_WIDTH) {
        setSidebarCollapsed(true);
        setSidebarWidth(MIN_SIDEBAR_WIDTH); // Keep a valid width for when it expands again
      } else {
        setSidebarCollapsed(false);
        // Allow smooth resizing from COLLAPSE_WIDTH to MAX_SIDEBAR_WIDTH
        setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, newWidth));
      }
    },
    [isResizing, setSidebarWidth, setSidebarCollapsed]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <TooltipProvider>
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
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          />
        )}

        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={cn(
            "fixed inset-y-0 left-0 z-30 transform md:relative md:z-0",
            // Mobile: slide in/out based on sidebarOpen with transition
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            !isResizing && "transition-transform duration-200 ease-in-out",
            // Desktop: hide when collapsed
            sidebarCollapsed && "md:hidden",
            "top-12 md:top-0" // Account for toolbar on mobile
          )}
          style={{
            width: `${sidebarWidth}px`,
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Sidebar />

          {/* Resize handle - Desktop only */}
          <div
            className="absolute -right-2 top-0 hidden h-full w-4 cursor-col-resize md:block"
            onMouseDown={handleMouseDown}
          >
            <div
              className="absolute right-2 top-0 h-full w-1.5 bg-transparent hover:bg-primary/30"
              style={{
                backgroundColor: isResizing ? "rgb(var(--primary) / 0.5)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Show sidebar button - Desktop only when collapsed */}
        {sidebarCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-2 z-10 hidden h-8 w-8 md:flex"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restore Sidebar</TooltipContent>
          </Tooltip>
        )}

        {/* Editor panel */}
        <EditorPanel />
      </div>
      </div>
    </TooltipProvider>
  );
}
