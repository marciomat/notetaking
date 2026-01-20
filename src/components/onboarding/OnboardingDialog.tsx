"use client";

import { useState, useEffect } from "react";
import type { AppOwner } from "@evolu/common";
import { useTabStore } from "@/lib/hooks/useTabStore";
import { Button } from "@/components/ui/button";
import { Copy, Check, AlertTriangle } from "lucide-react";

interface OnboardingDialogProps {
  owner: AppOwner;
  tabId: string;
}

export function OnboardingDialog({ owner, tabId }: OnboardingDialogProps) {
  const { tabs, markTabOnboardingComplete } = useTabStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const mnemonic = owner.mnemonic ?? "";
  const tab = tabs.find((t) => t.id === tabId);
  const isOnboardingComplete = tab?.isOnboardingComplete ?? false;

  useEffect(() => {
    // Show onboarding if not completed for this tab
    if (!isOnboardingComplete && mnemonic) {
      setIsOpen(true);
    }
  }, [isOnboardingComplete, mnemonic]);

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;

    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = mnemonic;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleComplete = () => {
    markTabOnboardingComplete(tabId);
    setIsOpen(false);
  };

  if (!isOpen || !mnemonic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-card-foreground">
          Welcome to Numpad
        </h2>

        <p className="mt-4 text-sm text-muted-foreground">
          Your database has been created. Please save your recovery phrase
          (mnemonic) in a safe place. This is the only way to recover your notes
          on another device.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-card-foreground">
            Your Recovery Phrase
          </label>
          <div className="mt-2 rounded-md border border-border bg-muted p-3">
            <p className="break-all font-mono text-sm text-muted-foreground">
              {mnemonic}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={handleCopyMnemonic}
            className="flex-1 gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            <strong>Warning:</strong> If you lose this recovery phrase, you will
            not be able to recover your notes. Store it securely.
          </p>
        </div>

        <Button
          onClick={handleComplete}
          className="mt-6 w-full"
        >
          I&apos;ve Saved My Recovery Phrase
        </Button>
      </div>
    </div>
  );
}
