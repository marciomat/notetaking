"use client";

import { Suspense, createContext, useContext } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { JazzOnboardingDialog } from "@/components/onboarding/JazzOnboardingDialog";
import { JazzAppLayout } from "@/components/layout/JazzAppLayout";
import { useWorkspaceNotes, type UseWorkspaceNotesResult } from "@/lib/jazz";
import { DataBridgeProvider } from "@/lib/jazz/dataBridge";

// Context to provide the current workspace's notes and folders
type WorkspaceContextType = UseWorkspaceNotesResult;

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

// Hook to access the current workspace's notes and folders
export function useCurrentWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useCurrentWorkspace must be used within a JazzTabContent");
  }
  return context;
}

interface JazzTabContentProps {
  tabId: string;
}

function TabAppContent({ tabId }: { tabId: string }) {
  const workspace = useCurrentWorkspace();

  if (!workspace.isLoaded) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <DataBridgeProvider>
      <JazzOnboardingDialog tabId={tabId} />
      <JazzAppLayout />
      <OfflineIndicator />
    </DataBridgeProvider>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function JazzTabContent({ tabId }: JazzTabContentProps) {
  const workspaceData = useWorkspaceNotes();

  return (
    <ErrorBoundary>
      <WorkspaceContext.Provider value={workspaceData}>
        <Suspense fallback={<LoadingFallback />}>
          <ErrorBoundary>
            <TabAppContent tabId={tabId} />
          </ErrorBoundary>
        </Suspense>
      </WorkspaceContext.Provider>
    </ErrorBoundary>
  );
}
