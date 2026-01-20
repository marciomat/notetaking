"use client";

import { useState } from "react";
import { useCurrentEvolu } from "@/components/app/TabContent";
import { useTabStore } from "@/lib/hooks/useTabStore";
import * as Evolu from "@evolu/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeScanner } from "@/components/ui/QRCodeScanner";
import { KeyRound, Plus } from "lucide-react";

interface SetupDialogProps {
  open: boolean;
  onComplete: () => void;
  tabId?: string;
}

export function SetupDialog({ open, onComplete, tabId }: SetupDialogProps) {
  const evolu = useCurrentEvolu();
  const { markTabOnboardingComplete } = useTabStore();
  const [mode, setMode] = useState<"choice" | "restore">("choice");
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCreateNew = () => {
    // Just complete setup - onboarding will show the mnemonic
    onComplete();
  };

  const handleRestore = async () => {
    const trimmedMnemonic = mnemonic.trim();

    if (!trimmedMnemonic) {
      setError("Please enter your recovery phrase");
      return;
    }

    // Validate mnemonic format (should be 12 or 24 words)
    const words = trimmedMnemonic.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError("Recovery phrase should be 12 or 24 words");
      return;
    }

    setIsRestoring(true);
    setError("");

    try {
      // Parse and restore the mnemonic
      const parsedMnemonic = Evolu.Mnemonic.from(trimmedMnemonic);
      if (!parsedMnemonic.ok) {
        setError("Invalid recovery phrase format");
        setIsRestoring(false);
        return;
      }

      // Mark setup and onboarding complete BEFORE restoreAppOwner
      // These flags must be persisted before the page reloads
      if (tabId) {
        markTabOnboardingComplete(tabId);
        const { markTabSetupComplete } = useTabStore.getState();
        markTabSetupComplete(tabId);
      }

      // Evolu's restoreAppOwner resets and reinitializes the database
      // It requires a page reload to ensure all state is refreshed
      // This is the recommended approach per Evolu documentation
      await evolu.restoreAppOwner(parsedMnemonic.value);
      
      // restoreAppOwner with default options triggers reload automatically
      // If we reach here, the reload didn't happen, so trigger it manually
      evolu.reloadApp();
    } catch (err) {
      console.error("Failed to restore:", err);
      setError("Failed to restore from recovery phrase. Please check and try again.");
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {mode === "choice" ? (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to Numpad</DialogTitle>
              <DialogDescription>
                Choose how you&apos;d like to get started
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <Button
                variant="default"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={handleCreateNew}
              >
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Create New Database</div>
                  <div className="text-xs text-primary-foreground/70">
                    Start fresh with a new notes database
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode("restore")}
              >
                <KeyRound className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Restore from Recovery Phrase</div>
                  <div className="text-xs text-muted-foreground">
                    Use an existing recovery phrase to restore your notes
                  </div>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Restore from Recovery Phrase</DialogTitle>
              <DialogDescription>
                Enter your 12 or 24 word recovery phrase to restore your notes
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div>
                <Textarea
                  placeholder="Enter your recovery phrase..."
                  value={mnemonic}
                  onChange={(e) => {
                    setMnemonic(e.target.value);
                    setError("");
                  }}
                  className="min-h-[100px] font-mono text-sm"
                  disabled={isRestoring}
                />
                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}
              </div>

              <QRCodeScanner
                onScan={(value) => {
                  setMnemonic(value);
                  setError("");
                }}
                buttonLabel="Scan QR Code"
                buttonVariant="secondary"
                className="w-full"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMode("choice");
                    setMnemonic("");
                    setError("");
                  }}
                  disabled={isRestoring}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRestore}
                  disabled={isRestoring || !mnemonic.trim()}
                >
                  {isRestoring ? "Restoring..." : "Restore"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
