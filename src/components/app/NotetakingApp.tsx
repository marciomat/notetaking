"use client";

import { Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabContent } from "@/components/app/TabContent";
import { TabBar } from "@/components/layout/TabBar";
import { Logo } from "@/components/ui/Logo";
import { useTabStore } from "@/lib/hooks/useTabStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function MultiTabApp() {
  const { tabs, activeTabId } = useTabStore();
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch for zustand persist
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Tab header bar */}
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-muted/30 px-2">
          <div className="flex items-center gap-2 pr-4">
            <Logo size={18} className="text-primary" />
            <span className="text-sm font-semibold">Numpad</span>
          </div>
          <TabBar className="flex-1" />
        </div>

        {/* Tab content - each tab gets its own Evolu provider */}
        <div className="relative flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "absolute inset-0",
                activeTabId === tab.id ? "z-10 visible" : "z-0 invisible"
              )}
            >
              <TabContent tabId={tab.id} />
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function NotetakingApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<LoadingFallback />}>
          <ErrorBoundary>
            <MultiTabApp />
          </ErrorBoundary>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
