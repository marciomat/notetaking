"use client";

import { use, Suspense } from "react";
import { EvoluClientProvider } from "@/components/providers/EvoluClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { useEvolu } from "@/lib/evolu";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import type { AppOwner } from "@evolu/common";

function AppContent() {
  const evolu = useEvolu();
  const owner = use(evolu.appOwner) as AppOwner;

  return (
    <>
      <OnboardingDialog owner={owner} />
      <AppLayout owner={owner} />
    </>
  );
}

export function NotetakingApp() {
  return (
    <ThemeProvider>
      <EvoluClientProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          }
        >
          <AppContent />
        </Suspense>
      </EvoluClientProvider>
    </ThemeProvider>
  );
}
