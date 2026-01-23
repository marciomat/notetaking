"use client";

import { JazzReactProvider, usePassphraseAuth, useLogOut } from "jazz-tools/react";
import { NumpadAccount } from "@/lib/jazz/schema";
import { createContext, useContext, type ReactNode } from "react";

// BIP39 English wordlist (2048 words)
// Using the standard English wordlist for passphrase generation
// Source: https://github.com/bitcoinjs/bip39/blob/master/src/wordlists/english.json
import { wordlist } from "@/lib/jazz/wordlist";

// Jazz Cloud sync peer URL
// Using email as temporary API key - replace with dashboard.jazz.tools key for production
const JAZZ_SYNC_PEER = "wss://cloud.jazz.tools/?key=numpad-notetaking@example.com";

// ============================================================================
// Auth Context - expose passphrase auth to components
// ============================================================================
interface JazzAuthContextType {
  passphrase: string;
  state: "anonymous" | "signedIn";
  signUp: (name?: string) => Promise<string>;
  logIn: (passphrase: string) => Promise<void>;
  logOut: () => void;
  generateRandomPassphrase: () => string;
  // Aliases for compatibility with existing component naming
  logInWithPassphrase: (passphrase: string) => Promise<void>;
  generatePassphrase: () => string;
}

const JazzAuthContext = createContext<JazzAuthContextType | null>(null);

export function useJazzAuth() {
  const context = useContext(JazzAuthContext);
  if (!context) {
    throw new Error("useJazzAuth must be used within a JazzProvider");
  }
  return context;
}

// ============================================================================
// Auth Provider Component - wraps JazzReactProvider with passphrase auth
// ============================================================================
function JazzAuthProvider({ children }: { children: ReactNode }) {
  const auth = usePassphraseAuth({
    wordlist,
  });
  const logOut = useLogOut();

  const contextValue: JazzAuthContextType = {
    passphrase: auth.passphrase ?? "",
    state: auth.state,
    signUp: auth.signUp,
    logIn: auth.logIn,
    logOut,
    generateRandomPassphrase: auth.generateRandomPassphrase,
    // Aliases for compatibility
    logInWithPassphrase: auth.logIn,
    generatePassphrase: auth.generateRandomPassphrase,
  };

  return (
    <JazzAuthContext.Provider value={contextValue}>
      {children}
    </JazzAuthContext.Provider>
  );
}

// ============================================================================
// Main Jazz Provider
// ============================================================================
interface JazzProviderProps {
  children: ReactNode;
}

export function JazzProvider({ children }: JazzProviderProps) {
  return (
    <JazzReactProvider
      sync={{ peer: JAZZ_SYNC_PEER }}
      AccountSchema={NumpadAccount}
    >
      <JazzAuthProvider>{children}</JazzAuthProvider>
    </JazzReactProvider>
  );
}

// Re-export hooks from jazz-tools/react for convenience
export { useAccount, useCoState, useIsAuthenticated } from "jazz-tools/react";
