"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import * as Evolu from "@evolu/common";
import { useEvolu } from "@/lib/evolu";
import type { AppOwner } from "@evolu/common";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: AppOwner;
}

export function SettingsDialog({
  open,
  onOpenChange,
  owner,
}: SettingsDialogProps) {
  const evolu = useEvolu();
  const [copied, setCopied] = useState(false);
  const [restoreMnemonic, setRestoreMnemonic] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const mnemonic = owner.mnemonic ?? "";

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;

    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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

  const handleRestore = async () => {
    if (!restoreMnemonic.trim()) {
      setRestoreError("Please enter a recovery phrase");
      return;
    }

    // Parse the mnemonic
    const parsedMnemonic = Evolu.Mnemonic.from(restoreMnemonic.trim());
    if (!parsedMnemonic.ok) {
      setRestoreError("Invalid recovery phrase format. Please check and try again.");
      return;
    }

    try {
      // restoreAppOwner will reload the page on success
      await evolu.restoreAppOwner(parsedMnemonic.value);
      // If we get here without a page reload, clear the form
      setRestoreError(null);
      setRestoreMnemonic("");
      setShowRestoreConfirm(false);
    } catch {
      setRestoreError("Failed to restore. Please check your recovery phrase.");
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        "Are you sure you want to reset? This will delete all local data. Make sure you have your recovery phrase saved!"
      )
    ) {
      await evolu.resetAppOwner();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your database and recovery options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Recovery Phrase */}
          {mnemonic && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your Recovery Phrase
              </label>
              <div className="rounded-md border border-border bg-muted p-3">
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {mnemonic}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopyMnemonic}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          )}

          <Separator />

          {/* Restore from Mnemonic */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Restore from Recovery Phrase
            </label>
            <p className="text-xs text-muted-foreground">
              Enter a recovery phrase to load a different database. This will
              replace your current local data.
            </p>

            {!showRestoreConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowRestoreConfirm(true)}
              >
                Restore from Phrase
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter recovery phrase..."
                  value={restoreMnemonic}
                  onChange={(e) => {
                    setRestoreMnemonic(e.target.value);
                    setRestoreError(null);
                  }}
                  className="font-mono text-xs"
                />
                {restoreError && (
                  <p className="text-xs text-destructive">{restoreError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setRestoreMnemonic("");
                      setRestoreError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleRestore}>
                    Restore
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </label>
            <p className="text-xs text-muted-foreground">
              Reset all local data. Your notes will be deleted from this device.
              You can restore them using your recovery phrase.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleReset}
            >
              Reset Local Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
