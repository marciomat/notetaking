"use client";

import { useState } from "react";
import { useJazzAuth } from "@/components/providers/JazzProvider";
import { useTabStore } from "@/lib/hooks/useTabStore";
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

interface JazzSetupDialogProps {
  open: boolean;
  onComplete: () => void;
  tabId?: string;
}

export function JazzSetupDialog({ open, onComplete, tabId }: JazzSetupDialogProps) {
  const { logInWithPassphrase, signUp } = useJazzAuth();
  const { markTabOnboardingComplete, markTabSetupComplete } = useTabStore();
  const [mode, setMode] = useState<"choice" | "restore">("choice");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = async () => {
    setIsCreating(true);
    setError("");

    try {
      // signUp creates the account and returns the passphrase
      const newPassphrase = await signUp("Numpad User");
      console.log("Account created, passphrase:", newPassphrase ? "received" : "none");
      
      // Complete setup - onboarding will show the passphrase
      onComplete();
    } catch (err) {
      console.error("Failed to create new account:", err);
      setError("Failed to create new database. Please try again.");
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    const trimmedPassphrase = passphrase.trim();

    if (!trimmedPassphrase) {
      setError("Please enter your recovery phrase");
      return;
    }

    // Validate passphrase format (should be 12 or 24 words for BIP39)
    const words = trimmedPassphrase.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError("Recovery phrase should be 12 or 24 words");
      return;
    }

    setIsRestoring(true);
    setError("");

    try {
      // Mark setup and onboarding complete BEFORE login
      if (tabId) {
        markTabOnboardingComplete(tabId);
        markTabSetupComplete(tabId);
      }

      // Log in with the passphrase
      await logInWithPassphrase(trimmedPassphrase);
      
      onComplete();
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
                disabled={isCreating}
              >
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">
                    {isCreating ? "Creating..." : "Create New Database"}
                  </div>
                  <div className="text-xs text-primary-foreground/70">
                    Start fresh with a new notes database
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode("restore")}
                disabled={isCreating}
              >
                <KeyRound className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Restore from Recovery Phrase</div>
                  <div className="text-xs text-muted-foreground">
                    Use an existing recovery phrase to restore your notes
                  </div>
                </div>
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
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
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
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
                  setPassphrase(value);
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
                    setPassphrase("");
                    setError("");
                  }}
                  disabled={isRestoring}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRestore}
                  disabled={isRestoring || !passphrase.trim()}
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
