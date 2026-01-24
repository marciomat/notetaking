"use client";

import { useIsAuthenticated, usePassphraseAuth } from "jazz-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { wordlist } from "@/lib/wordlist";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import jsQR from "jsqr";

export function AuthModal() {
  const isAuthenticated = useIsAuthenticated();
  // usePassphraseAuth provides:
  // - passphrase: the current account's passphrase (auto-generated with valid BIP-39 checksum)
  // - logIn(passphrase): log in with an existing passphrase
  // - signUp(name?): convert current anonymous account to signed-up account
  const { logIn, signUp, passphrase: currentPassphrase } = usePassphraseAuth({ wordlist });
  
  const [activeTab, setActiveTab] = useState<"create" | "restore">("create");
  const [inputPassphrase, setInputPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // The passphrase from usePassphraseAuth is the correct BIP-39 passphrase
  // for the current anonymous account
  const generatedPassphrase = currentPassphrase || "Loading...";

  const handleCopy = useCallback(async () => {
    if (!currentPassphrase) return;
    try {
      await navigator.clipboard.writeText(currentPassphrase);
      setHasCopied(true);
      toast.success("Passphrase copied to clipboard");
    } catch {
      toast.error("Failed to copy passphrase");
    }
  }, [currentPassphrase]);

  const handleCreate = useCallback(async () => {
    if (!currentPassphrase) {
      toast.error("Passphrase not ready. Please wait.");
      return;
    }
    
    setIsLoading(true);
    try {
      // signUp() converts the current anonymous account to a signed-up account
      // It returns the passphrase, but we already have it from usePassphraseAuth
      await signUp();
      // Store passphrase for QR sharing feature
      localStorage.setItem("numpad-passphrase", currentPassphrase);
      toast.success("Account created successfully");
    } catch (error) {
      toast.error("Failed to create account");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [signUp, currentPassphrase]);

  const handleRestore = useCallback(async () => {
    const phrase = inputPassphrase.trim().toLowerCase();
    
    // Validate each word individually to find issues
    const words = phrase.split(/\s+/);
    console.log("Passphrase words:", words);
    console.log("Number of words:", words.length);
    
    // Check each word
    const invalidWords: string[] = [];
    for (const word of words) {
      if (!wordlist.includes(word)) {
        invalidWords.push(word);
        console.log("Invalid word found:", word);
      }
    }
    
    if (invalidWords.length > 0) {
      toast.error(`Invalid words: ${invalidWords.join(", ")}`);
      return;
    }
    
    // BIP-39 supports 12, 15, 18, 21, or 24 words - Jazz uses 24
    if (words.length !== 24) {
      toast.error(`Expected 24 words, got ${words.length}`);
      return;
    }
    
    setIsLoading(true);
    try {
      // Normalize the phrase - single spaces between words
      const normalizedPhrase = words.join(" ");
      console.log("Normalized phrase:", normalizedPhrase);
      await logIn(normalizedPhrase);
      // Store passphrase for QR sharing feature
      localStorage.setItem("numpad-passphrase", normalizedPhrase);
      toast.success("Account restored successfully");
    } catch (error) {
      console.error("Login error details:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Invalid passphrase")) {
        toast.error("Invalid passphrase format. Please check your words.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("doesn't exist")) {
        toast.error("No account found with this passphrase. Try creating a new account.");
      } else {
        toast.error(`Failed to restore: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inputPassphrase, logIn]);

  const stopScanning = useCallback(() => {
    setScanning(false);
    setCameraReady(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera not available on this device");
      return;
    }

    try {
      let stream: MediaStream;

      // Try with rear camera first, then fallback to any camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
        });
      } catch {
        // Fallback: try without facingMode constraint
        console.log("Rear camera failed, trying any camera...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      // Store the stream
      streamRef.current = stream;

      // Now show the scanning UI - the video element will be rendered
      setScanning(true);
      setCameraReady(false);
    } catch (error) {
      console.error("Camera error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "";

      if (errorName === "NotAllowedError" || errorMsg.includes("Permission") || errorMsg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (errorName === "NotFoundError" || errorMsg.includes("NotFound")) {
        toast.error("No camera found on this device");
      } else if (errorName === "NotReadableError" || errorMsg.includes("NotReadable")) {
        toast.error("Camera is in use by another application");
      } else if (errorName === "OverconstrainedError") {
        toast.error("Camera does not meet requirements");
      } else {
        toast.error(`Camera error: ${errorMsg}`);
      }
    }
  }, []);

  // Attach stream to video element once it's rendered
  useEffect(() => {
    if (scanning && streamRef.current && videoRef.current && !cameraReady) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      
      const handleCanPlay = () => {
        video.play()
          .then(() => setCameraReady(true))
          .catch((err) => {
            console.error("Failed to play video:", err);
            toast.error("Failed to start camera preview");
            stopScanning();
          });
      };
      
      video.addEventListener("canplay", handleCanPlay);
      
      // Also try to play immediately in case canplay already fired
      if (video.readyState >= 3) {
        handleCanPlay();
      }
      
      return () => {
        video.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [scanning, cameraReady, stopScanning]);

  const startScanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scan = () => {
      if (!video.readyState || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code?.data) {
        const phrase = code.data.trim();
        const words = phrase.split(/\s+/);
        
        // Validate it's a proper BIP-39 passphrase
        if (words.length === 24 && words.every(w => wordlist.includes(w))) {
          setInputPassphrase(phrase);
          stopScanning();
          toast.success("QR code scanned successfully");
          return; // Stop scanning loop after successful scan
        }
      }

      animationRef.current = requestAnimationFrame(scan);
    };

    scan();
  }, [stopScanning]);

  useEffect(() => {
    if (cameraReady) {
      startScanFrame();
    }
  }, [cameraReady, startScanFrame]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={!isAuthenticated}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome to Numpad</DialogTitle>
          <DialogDescription>
            Your notes are encrypted with a 12-word passphrase. Save it somewhere safe - it&apos;s the only way to access your notes.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "restore")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Secret Passphrase</label>
              <div className="p-4 bg-muted rounded-lg font-mono text-sm leading-relaxed break-words">
                {generatedPassphrase}
              </div>
              <p className="text-xs text-muted-foreground">
                Write this down or store it in a password manager. You cannot recover your notes without it.
              </p>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleCopy}
                className="flex-1"
              >
                {hasCopied ? "✓ Copied" : "Copy Passphrase"}
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="restore" className="space-y-4">
            {scanning ? (
              <div className="space-y-4">
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                      <span className="animate-pulse">Starting camera...</span>
                    </div>
                  )}
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    webkit-playsinline="true"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-2 border-primary/50 m-8 rounded pointer-events-none" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 right-4 z-20"
                    onClick={stopScanning}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-sm text-muted-foreground text-center">
                  Point your camera at a QR code containing your passphrase
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enter Your Passphrase</label>
                  <Textarea
                    placeholder="Enter your 24 word passphrase..."
                    value={inputPassphrase}
                    onChange={(e) => setInputPassphrase(e.target.value)}
                    className="font-mono resize-none h-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 24 words separated by spaces, or scan a QR code.
                  </p>
                </div>
                
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline"
                    onClick={startScanning}
                    className="flex-1 gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Scan QR Code
                  </Button>
                  <Button 
                    onClick={handleRestore} 
                    disabled={isLoading || !inputPassphrase.trim()}
                    className="flex-1"
                  >
                    {isLoading ? "Restoring..." : "Restore Account"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
