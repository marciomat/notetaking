"use client";

import { useState, useEffect } from "react";
import { useJazzAuth } from "@/components/providers/JazzProvider";
import { useTabStore } from "@/lib/hooks/useTabStore";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { Copy, Check, AlertTriangle } from "lucide-react";

interface JazzOnboardingDialogProps {
  tabId: string;
}

export function JazzOnboardingDialog({ tabId }: JazzOnboardingDialogProps) {
  const { passphrase } = useJazzAuth();
  const { tabs, markTabOnboardingComplete } = useTabStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const tab = tabs.find((t) => t.id === tabId);
  const isOnboardingComplete = tab?.isOnboardingComplete ?? false;

  useEffect(() => {
    // Show onboarding if not completed for this tab and we have a passphrase
    if (!isOnboardingComplete && passphrase) {
      setIsOpen(true);
    }
  }, [isOnboardingComplete, passphrase]);

  const handleCopyPassphrase = async () => {
    if (!passphrase) return;

    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = passphrase;
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

  if (!isOpen || !passphrase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-card-foreground">
          Welcome to Numpad
        </h2>

        <p className="mt-4 text-sm text-muted-foreground">
          Your database has been created. Please save your recovery phrase
          in a safe place. This is the only way to recover your notes
          on another device.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-card-foreground">
            Your Recovery Phrase
          </label>
          <div className="mt-2 rounded-md border border-border bg-muted p-3">
            <p className="break-all font-mono text-sm text-muted-foreground">
              {passphrase}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={handleCopyPassphrase}
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
          <Button
            variant="outline"
            onClick={() => setShowQR(!showQR)}
            className="px-4"
          >
            {showQR ? "Hide QR" : "Show QR"}
          </Button>
        </div>

        {showQR && (
          <div className="mt-4 flex justify-center">
            <QRCodeDisplay value={passphrase} />
          </div>
        )}

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
