"use client";

import { useIsAuthenticated, usePassphraseAuth } from "jazz-react";
import { useState, useCallback, useEffect } from "react";
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
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

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
    if (!hasCopied) {
      toast.error("Please copy your passphrase first - you will need it to recover your account");
      return;
    }
    
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
  }, [hasCopied, signUp, currentPassphrase]);

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
              <div className="relative">
                <div 
                  className={`p-4 bg-muted rounded-lg font-mono text-sm leading-relaxed break-words ${
                    !showPassphrase ? "blur-sm select-none" : ""
                  }`}
                >
                  {generatedPassphrase}
                </div>
                {!showPassphrase && (
                  <button
                    onClick={() => setShowPassphrase(true)}
                    className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Click to reveal
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Write this down or store it in a password manager. You cannot recover your notes without it.
              </p>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleCopy}
                disabled={!showPassphrase}
                className="flex-1"
              >
                {hasCopied ? "✓ Copied" : "Copy Passphrase"}
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isLoading || !hasCopied}
                className="flex-1"
              >
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="restore" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Your Passphrase</label>
              <Textarea
                placeholder="Enter your 12 word passphrase..."
                value={inputPassphrase}
                onChange={(e) => setInputPassphrase(e.target.value)}
                className="font-mono resize-none h-24"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 12 words separated by spaces.
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={handleRestore} 
                disabled={isLoading || !inputPassphrase.trim()}
                className="w-full"
              >
                {isLoading ? "Restoring..." : "Restore Account"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
