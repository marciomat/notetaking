"use client";

import { Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { JazzTabContent } from "@/components/app/JazzTabContent";
import { JazzSetupDialog } from "@/components/onboarding/JazzSetupDialog";
import { Logo } from "@/components/ui/Logo";
import { useJazzAuth } from "@/components/providers/JazzProvider";
import { useWorkspaces } from "@/lib/jazz";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function JazzMultiTabApp() {
  const { state: authState } = useJazzAuth();
  const { tabs, activeIndex, isLoaded } = useWorkspaces();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
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

  // Show setup dialog if not authenticated
  if (authState === "anonymous") {
    return (
      <JazzSetupDialog
        open={true}
        onComplete={() => {
          // Auth state will change when user logs in
          console.log("Setup complete");
        }}
      />
    );
  }

  // Show loading while workspaces are being loaded
  if (!isLoaded || tabs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  // For now, just show the active workspace (no tab bar)
  // TODO: Add tab bar for multiple workspaces
  const activeTab = tabs[activeIndex] ?? tabs[0];

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Simple header without tabs for now */}
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-muted/30 px-4">
          <div className="flex items-center gap-2">
            <Logo size={18} className="text-primary" />
            <span className="text-sm font-semibold">Numpad</span>
          </div>
          {tabs.length > 1 && (
            <span className="ml-4 text-sm text-muted-foreground">
              {activeTab.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
          <JazzTabContent tabId={activeTab.id} />
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

export function JazzNotetakingApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<LoadingFallback />}>
          <ErrorBoundary>
            <JazzMultiTabApp />
          </ErrorBoundary>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
