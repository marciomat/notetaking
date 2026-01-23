"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PanelLeft } from "lucide-react";
import { JazzToolbar } from "@/components/layout/JazzToolbar";
import { JazzSidebar } from "@/components/layout/JazzSidebar";
import { JazzEditorPanel } from "@/components/editor/JazzEditorPanel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useSettingsQuery, useMutations } from "@/lib/jazz/dataBridge";
import { cn } from "@/lib/utils";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 600;
const COLLAPSE_WIDTH = 56;

export function JazzAppLayout() {
  const { insert, update } = useMutations();
  const settings = useSettingsQuery();
  
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
      // Create settings row if it doesn't exist
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

      if (newWidth <= COLLAPSE_WIDTH) {
        setSidebarCollapsed(true);
        setSidebarWidth(MIN_SIDEBAR_WIDTH);
      } else {
        setSidebarCollapsed(false);
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
        <JazzToolbar />

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
              "fixed inset-y-0 z-30 md:relative md:z-0",
              sidebarOpen ? "left-0" : "-left-full md:left-0",
              !isResizing && "transition-[left] duration-200 ease-in-out",
              sidebarCollapsed && "md:hidden",
              "top-12 md:top-0"
            )}
            style={{
              width: `${sidebarWidth}px`,
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <JazzSidebar />

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
          <JazzEditorPanel />
        </div>
      </div>
    </TooltipProvider>
  );
}
