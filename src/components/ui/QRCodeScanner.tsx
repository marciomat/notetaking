"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when dialog closes
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      setIsScanning(false);
      setError(null);
    }
  }, [isOpen]);

  const startScanner = async () => {
    if (!containerRef.current) return;

    setError(null);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader");
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
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setIsScanning(false);
          setIsOpen(false);
          onScan(decodedText);
        },
        () => {
          // Error callback (called frequently when no QR found)
          // We don't need to handle this
        }
      );
    } catch (err) {
      setIsScanning(false);
      if (err instanceof Error) {
        if (err.message.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access and try again.");
        } else if (err.message.includes("NotFoundError")) {
          setError("No camera found on this device.");
        } else {
          setError("Failed to start camera. Please try again.");
        }
      } else {
        setError("Failed to start camera. Please try again.");
      }
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
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
        <Camera className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at a recovery phrase QR code to scan it
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4">
            <div
              ref={containerRef}
              id="qr-reader"
              className="w-full max-w-[300px] aspect-square bg-muted rounded-lg overflow-hidden relative"
            >
              {!isScanning && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
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
