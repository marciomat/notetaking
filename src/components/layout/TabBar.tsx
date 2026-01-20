"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Pencil, Check, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useTabStore, type DatabaseTab } from "@/lib/hooks/useTabStore";
import { disposeEvoluForTab, hasEvoluInstance } from "@/lib/evolu/databaseFactory";

interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, renameTab } = useTabStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [tabToClose, setTabToClose] = useState<DatabaseTab | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = (tab: DatabaseTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleFinishRename = () => {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishRename();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
      setEditingName("");
    }
  };

  const handleCloseTab = (tab: DatabaseTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabToClose(tab);
  };

  const confirmCloseTab = async () => {
    if (!tabToClose || isClosing) return;
    
    setIsClosing(true);
    
    try {
      // Always delete the database to free storage
      // If offline, data will be lost (user was warned), but no point keeping orphaned data
      // If online, data is synced and can be restored later
      if (hasEvoluInstance(tabToClose.id)) {
        await disposeEvoluForTab(tabToClose.id, true);
      }
      
      // Remove from tab store
      removeTab(tabToClose.id);
    } catch (error) {
      console.error("Error closing tab:", error);
      // Still remove the tab even if cleanup fails
      removeTab(tabToClose.id);
    } finally {
      setTabToClose(null);
      setIsClosing(false);
    }
  };

  const handleAddTab = () => {
    addTab();
  };

  return (
    <>
      <div className={cn("flex items-center gap-1 overflow-x-auto", className)}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group relative flex min-w-[120px] max-w-[200px] cursor-pointer items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors",
              activeTabId === tab.id
                ? "border-border bg-background text-foreground"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {editingTabId === tab.id ? (
              <div className="flex w-full items-center gap-1">
                <Input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={handleKeyDown}
                  className="h-5 flex-1 px-1 py-0 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 shrink-0 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFinishRename();
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate">{tab.name}</span>
                
                {/* Action buttons container - stays on the right */}
                <div className="flex shrink-0 items-center gap-0.5">
                  {/* Rename button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleStartRename(tab, e)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rename tab</TooltipContent>
                  </Tooltip>

                  {/* Close button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleCloseTab(tab, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close tab</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new tab button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleAddTab}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New database</TooltipContent>
        </Tooltip>
      </div>

      {/* Close confirmation dialog */}
      <AlertDialog open={!!tabToClose} onOpenChange={(open) => !open && !isClosing && setTabToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {!isOnline && <AlertTriangle className="h-5 w-5 text-destructive" />}
              Close Database Tab?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to close &quot;{tabToClose?.name}&quot;?
                </p>
                
                {/* Online/Offline status indicator */}
                <div className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  isOnline 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {isOnline ? (
                    <>
                      <Wifi className="h-4 w-4" />
                      <span>Online — Database is synced. You can restore it later with the recovery phrase.</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4" />
                      <span>
                        <strong>Offline — Data may not be synced!</strong> Any notes created on this device that haven&apos;t synced will be permanently lost.
                      </span>
                    </>
                  )}
                </div>

                {tabs.length === 1 && (
                  <p className="text-muted-foreground">
                    This is the last tab. The app will reset to its initial state.
                  </p>
                )}

                <p className="text-muted-foreground">
                  Local data will be deleted to free storage. To access this database again, create a new tab and restore using the recovery phrase.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCloseTab}
              disabled={isClosing}
              className={cn(!isOnline && "bg-destructive hover:bg-destructive/90")}
            >
              {isClosing ? "Closing..." : isOnline ? "Close Tab" : "Close Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
