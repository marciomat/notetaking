"use client";

import { Suspense, useState, useEffect } from "react";
import { EvoluClientProvider } from "@/components/providers/EvoluClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { useEvolu } from "@/lib/evolu";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SetupDialog, isSetupComplete } from "@/components/onboarding/SetupDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import type { AppOwner } from "@evolu/common";

function AppContent() {
  const evolu = useEvolu();
  const [owner, setOwner] = useState<AppOwner | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  // Check if setup is complete
  useEffect(() => {
    const setupComplete = isSetupComplete();
    setShowSetup(!setupComplete);
    setSetupChecked(true);
  }, []);

  useEffect(() => {
    // Don't load owner until setup check is done
    if (!setupChecked) return;

    let mounted = true;

    evolu.appOwner
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
  }, [evolu, setupChecked]);

  const handleSetupComplete = () => {
    setShowSetup(false);
    // Reload the owner after restore
    evolu.appOwner.then(setOwner).catch(console.error);
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
    return <SetupDialog open={true} onComplete={handleSetupComplete} />;
  }

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingDialog owner={owner} />
      <AppLayout owner={owner} />
      <OfflineIndicator />
    </>
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
        <ErrorBoundary>
          <EvoluClientProvider>
            <Suspense fallback={<LoadingFallback />}>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </Suspense>
          </EvoluClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
