"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePassphraseAuth } from "jazz-react";
import { wordlist } from "@/lib/wordlist";
import { Camera, Copy, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SeedShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeedShareModal({ open, onOpenChange }: SeedShareModalProps) {
  const { logIn } = usePassphraseAuth({ wordlist });
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedPhrase, setScannedPhrase] = useState("");
  const [manualPhrase, setManualPhrase] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get current passphrase from localStorage (stored during sign-up/login)
  const [currentPassphrase, setCurrentPassphrase] = useState<string | null>(null);

  useEffect(() => {
    // We store the passphrase in localStorage during sign-up/login
    const stored = localStorage.getItem("numpad-passphrase");
    if (stored) {
      setCurrentPassphrase(stored);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!currentPassphrase) return;
    try {
      await navigator.clipboard.writeText(currentPassphrase);
      setCopied(true);
      toast.success("Passphrase copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy passphrase");
    }
  };

  const stopScanning = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      // Validate that it looks like a passphrase (12 words)
      const words = code.data.trim().split(/\s+/);
      if (words.length === 12) {
        setScannedPhrase(code.data);
        stopScanning();
        toast.success("QR code scanned successfully!");
        return;
      }
    }

    animationRef.current = requestAnimationFrame(scanFrame);
  }, [stopScanning]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      toast.error("Camera access denied. Please allow camera access to scan QR codes.");
    }
  };

  const handleRestore = async (phrase: string) => {
    const words = phrase.trim().toLowerCase().split(/\s+/);
    if (words.length !== 12) {
      toast.error("Invalid passphrase. Please enter 12 words.");
      return;
    }

    // Validate all words are in wordlist
    const invalidWords = words.filter((w) => !wordlist.includes(w));
    if (invalidWords.length > 0) {
      toast.error(`Invalid words: ${invalidWords.join(", ")}`);
      return;
    }

    setIsRestoring(true);
    try {
      await logIn(phrase.trim().toLowerCase());
      toast.success("Account synced successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error("Failed to sync account. Please check your passphrase.");
    } finally {
      setIsRestoring(false);
    }
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  useEffect(() => {
    if (!open) {
      stopScanning();
      setScannedPhrase("");
      setManualPhrase("");
    }
  }, [open, stopScanning]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync to Another Device</DialogTitle>
          <DialogDescription>
            Use your passphrase to sync notes across devices
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="show">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="show">Show QR</TabsTrigger>
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
          </TabsList>

          <TabsContent value="show" className="space-y-4">
            {currentPassphrase ? (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={currentPassphrase} size={200} level="M" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code on another device to sync your notes.
                </p>
                <Button onClick={handleCopy} variant="outline" className="w-full">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy passphrase
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Passphrase not available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            {scannedPhrase ? (
              <div className="space-y-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm font-medium mb-2">Scanned passphrase:</p>
                  <p className="text-xs font-mono break-all">{scannedPhrase}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRestore(scannedPhrase)}
                    disabled={isRestoring}
                    className="flex-1"
                  >
                    {isRestoring ? "Syncing..." : "Sync Account"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScannedPhrase("");
                      startScanning();
                    }}
                  >
                    Rescan
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                  {scanning ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-primary/50 m-8 rounded" />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Button onClick={startScanning}>
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                {scanning && (
                  <Button onClick={stopScanning} variant="outline" className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Stop Scanning
                  </Button>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or enter manually
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Enter 12-word passphrase..."
                    value={manualPhrase}
                    onChange={(e) => setManualPhrase(e.target.value)}
                  />
                  <Button
                    onClick={() => handleRestore(manualPhrase)}
                    disabled={isRestoring || !manualPhrase.trim()}
                    className="w-full"
                  >
                    {isRestoring ? "Syncing..." : "Sync Account"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
