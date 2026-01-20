"use client";

import { Suspense, useState, useEffect, useMemo, createContext, useContext } from "react";
import { EvoluProvider } from "@evolu/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SetupDialog } from "@/components/onboarding/SetupDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { getEvoluForTab, createUseEvoluForTab } from "@/lib/evolu/databaseFactory";
import { useTabStore } from "@/lib/hooks/useTabStore";
import type { AppOwner } from "@evolu/common";

// Types for the evolu instance
type EvoluInstance = ReturnType<typeof getEvoluForTab>;

// Context to provide the current tab's Evolu instance and hook
interface TabEvoluContextType {
  evoluInstance: EvoluInstance;
  useEvolu: ReturnType<typeof createUseEvoluForTab>;
  tabId: string;
}

const TabEvoluContext = createContext<TabEvoluContextType | null>(null);

// Hook to get the current tab's evolu instance (the raw instance)
export function useCurrentEvolu(): EvoluInstance {
  const context = useContext(TabEvoluContext);
  if (!context) {
    throw new Error("useCurrentEvolu must be used within a TabContent");
  }
  return context.evoluInstance;
}

// Hook to get the current tab's useEvolu hook result (for accessing mutations etc.)
export function useTabEvoluHook() {
  const context = useContext(TabEvoluContext);
  if (!context) {
    throw new Error("useTabEvoluHook must be used within a TabContent");
  }
  return context.useEvolu();
}

interface TabContentProps {
  tabId: string;
}

function TabAppContent({ tabId }: { tabId: string }) {
  const evoluInstance = useCurrentEvolu();
  const { markTabSetupComplete, tabs } = useTabStore();
  
  const [owner, setOwner] = useState<AppOwner | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  const tab = tabs.find(t => t.id === tabId);
  const isSetupComplete = tab?.isSetupComplete ?? false;

  // Subscribe to Evolu errors to detect sync issues
  useEffect(() => {
    const unsubscribe = evoluInstance.subscribeError(() => {
      const evoluError = evoluInstance.getError();
      if (evoluError) {
        // Only log non-quota errors as errors, quota is just a warning
        if (evoluError.type === "ProtocolQuotaError") {
          console.warn("[Evolu] Quota exceeded for owner:", evoluError.ownerId);
        } else {
          console.error("[Evolu Sync Error]", evoluError);
        }
      }
    });
    return unsubscribe;
  }, [evoluInstance]);

  // Debug: Log sync state and owner info on mount
  // Also trigger useOwner to ensure sync is active (fixes stale SharedWorker state)
  useEffect(() => {
    let unuseOwner: (() => void) | null = null;
    
    evoluInstance.appOwner.then((appOwner) => {
      console.log("[Evolu Debug] Tab:", tabId, "Owner ID:", appOwner.id);
      console.log("[Evolu Debug] Mnemonic present:", !!appOwner.mnemonic);
      
      // Force sync by re-using the owner
      // This ensures sync is active even if SharedWorker state was stale
      unuseOwner = evoluInstance.useOwner(appOwner);
      console.log("[Evolu Debug] Triggered useOwner for sync");
    });
    
    // Return cleanup to stop using the owner when unmounting
    return () => {
      if (unuseOwner) {
        unuseOwner();
      }
    };
  }, [evoluInstance, tabId]);

  // Check if setup is complete for this tab
  useEffect(() => {
    setShowSetup(!isSetupComplete);
    setSetupChecked(true);
  }, [isSetupComplete]);

  useEffect(() => {
    if (!setupChecked) return;

    let mounted = true;

    evoluInstance.appOwner
      .then((appOwner) => {
        if (mounted) {
          setOwner(appOwner);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Failed to load app owner:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      mounted = false;
    };
  }, [evoluInstance, setupChecked]);

  const handleSetupComplete = () => {
    markTabSetupComplete(tabId);
    setShowSetup(false);
    // Reload the owner after restore
    evoluInstance.appOwner.then(setOwner).catch(console.error);
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Database Error</h1>
        <p className="mt-4 max-w-md text-sm text-gray-600">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show setup dialog if needed
  if (showSetup && owner) {
    return <SetupDialog open={true} onComplete={handleSetupComplete} tabId={tabId} />;
  }

  if (!owner) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingDialog owner={owner} tabId={tabId} />
      <AppLayout owner={owner} />
      <OfflineIndicator />
    </>
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

export function TabContent({ tabId }: TabContentProps) {
  // Create the Evolu instance and hook for this tab
  const evoluInstance = useMemo(() => getEvoluForTab(tabId), [tabId]);
  const useEvoluHook = useMemo(() => createUseEvoluForTab(tabId), [tabId]);
  
  const contextValue = useMemo(() => ({
    evoluInstance,
    useEvolu: useEvoluHook,
    tabId,
  }), [evoluInstance, useEvoluHook, tabId]);

  return (
    <ErrorBoundary>
      <EvoluProvider value={evoluInstance}>
        <TabEvoluContext.Provider value={contextValue}>
          <Suspense fallback={<LoadingFallback />}>
            <ErrorBoundary>
              <TabAppContent tabId={tabId} />
            </ErrorBoundary>
          </Suspense>
        </TabEvoluContext.Provider>
      </EvoluProvider>
    </ErrorBoundary>
  );
}
