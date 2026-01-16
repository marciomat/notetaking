"use client";

import { use, Suspense } from "react";
import { EvoluClientProvider } from "@/components/providers/EvoluClientProvider";
import { useEvolu } from "@/lib/evolu";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import type { AppOwner } from "@evolu/common";

function AppContent() {
  const evolu = useEvolu();
  const owner = use(evolu.appOwner) as AppOwner;

  return (
    <div className="min-h-screen bg-background">
      {/* Show onboarding dialog - owner always exists but we may want to show mnemonic */}
      <OnboardingDialog owner={owner} />

      {/* Main app content */}
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold">Notetaking App</h1>
        <p className="mt-4 text-muted-foreground">
          Your local-first note-taking application
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Database initialized with owner ID: {owner.id.slice(0, 8)}...
        </p>
      </main>
    </div>
  );
}

export function NotetakingApp() {
  return (
    <EvoluClientProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <AppContent />
      </Suspense>
    </EvoluClientProvider>
  );
}
