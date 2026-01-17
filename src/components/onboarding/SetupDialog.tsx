"use client";

import { useState } from "react";
import { useEvolu } from "@/lib/evolu";
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
import { KeyRound, Plus } from "lucide-react";

interface SetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

const SETUP_COMPLETE_KEY = "notetaking_setup_complete";
const ONBOARDING_COMPLETE_KEY = "notetaking_onboarding_complete";

export function isSetupComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SETUP_COMPLETE_KEY) === "true";
}

export function markSetupComplete(): void {
  localStorage.setItem(SETUP_COMPLETE_KEY, "true");
}

function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
}

export function SetupDialog({ open, onComplete }: SetupDialogProps) {
  const evolu = useEvolu();
  const [mode, setMode] = useState<"choice" | "restore">("choice");
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCreateNew = () => {
    markSetupComplete();
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

      // Set flags BEFORE restore since it may reload the page
      markSetupComplete();
      markOnboardingComplete(); // Skip onboarding since user already has their mnemonic

      await evolu.restoreAppOwner(parsedMnemonic.value);
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
              <DialogTitle>Welcome to Notetaking</DialogTitle>
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
