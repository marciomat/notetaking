"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRCodeScannerProps {
  onScan: (value: string) => void;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function QRCodeScanner({
  onScan,
  buttonLabel = "Scan QR Code",
  buttonVariant = "outline",
  buttonSize = "sm",
  className,
}: QRCodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const scannerIdRef = useRef<string>(`qr-reader-${Date.now()}`);
  const isMountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // @ts-expect-error - Html5Qrcode type
        const isScanning = scannerRef.current.isScanning;
        if (isScanning) {
          // @ts-expect-error - Html5Qrcode type
          await scannerRef.current.stop();
        }
        // @ts-expect-error - Html5Qrcode type
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // Generate new ID each time dialog opens
    if (isOpen) {
      scannerIdRef.current = `qr-reader-${Date.now()}`;
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen, stopScanner]);

  const startScanner = async () => {
    setError(null);
    setIsScanning(true);

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");

      // Stop any existing scanner first
      await stopScanner();

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isMountedRef.current) return;

      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Success callback
          stopScanner().then(() => {
            if (isMountedRef.current) {
              setIsScanning(false);
              setIsOpen(false);
              onScan(decodedText);
            }
          });
        },
        () => {
          // Error callback (called frequently when no QR found)
          // We don't need to handle this
        }
      );
    } catch (err) {
      if (!isMountedRef.current) return;

      setIsScanning(false);
      if (err instanceof Error) {
        if (err.message.includes("Permission") || err.message.includes("NotAllowedError")) {
          setError("Camera permission denied. Please allow camera access and try again.");
        } else if (err.message.includes("NotFoundError") || err.message.includes("NotFound")) {
          setError("No camera found on this device.");
        } else {
          setError("Failed to start camera. Please try again.");
        }
      } else {
        setError("Failed to start camera. Please try again.");
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setIsScanning(false);
    setError(null);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <Camera className={buttonLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {buttonLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at a recovery phrase QR code to scan it
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4">
            <div
              id={scannerIdRef.current}
              className="w-full max-w-[300px] aspect-square bg-muted rounded-lg overflow-hidden relative"
            >
              {!isScanning && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <ScanLine className="h-12 w-12 text-muted-foreground mb-4" />
                  <Button onClick={startScanner}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/50 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={startScanner}
                >
                  Try Again
                </Button>
              </div>
            )}

            {isScanning && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scanning... Position the QR code within the frame
              </p>
            )}
          </div>

          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
