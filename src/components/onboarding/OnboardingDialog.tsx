"use client";

import { useState, useEffect } from "react";
import type { AppOwner } from "@evolu/common";

interface OnboardingDialogProps {
  owner: AppOwner;
}

const ONBOARDING_COMPLETE_KEY = "numpad_onboarding_complete";

export function OnboardingDialog({ owner }: OnboardingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const mnemonic = owner.mnemonic ?? "";

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!completed && mnemonic) {
      setIsOpen(true);
    }
  }, [mnemonic]);

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
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
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
          <button
            onClick={handleCopyMnemonic}
            className="flex-1 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            <strong>Warning:</strong> If you lose this recovery phrase, you will
            not be able to recover your notes. Store it securely.
          </p>
        </div>

        <button
          onClick={handleComplete}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          I&apos;ve Saved My Recovery Phrase
        </button>
      </div>
    </div>
  );
}
