"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Cache for Evolu instances by tab ID
const evoluInstances = new Map<string, ReturnType<typeof createEvoluInstance>>();

// Create an Evolu instance with a unique name based on tab ID
function createEvoluInstance(tabId: string) {
  // Use tabId to create a unique database name
  // For the default tab, use "numpad" for backwards compatibility
  const dbName = tabId === "default" ? "numpad" : `numpad_${tabId}`;
  
  const instance = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
    name: Evolu.SimpleName.orThrow(dbName),
    transports: [
      // Primary relay - contains all historical data (1MB quota limit per owner)
      { type: "WebSocket", url: "wss://free.evoluhq.com" },
      // Backup relay - higher quota but doesn't have old data yet
      { type: "WebSocket", url: "https://relay-production-fb15.up.railway.app/" },
    ],
    // Enable logging to debug sync issues
    enableLogging: true,
  });
  
  return instance;
}

// Get or create an Evolu instance for a tab
export function getEvoluForTab(tabId: string) {
  if (!evoluInstances.has(tabId)) {
    const instance = createEvoluInstance(tabId);
    evoluInstances.set(tabId, instance);
  }
  return evoluInstances.get(tabId)!;
}

// Create a hook for accessing the current tab's Evolu
export function createUseEvoluForTab(tabId: string) {
  const instance = getEvoluForTab(tabId);
  return createUseEvolu(instance);
}

// Clean up an Evolu instance when a tab is closed
// If deleteData is true, also reset/delete the database to free storage
export async function disposeEvoluForTab(tabId: string, deleteData: boolean = false): Promise<void> {
  const instance = evoluInstances.get(tabId);
  
  if (instance && deleteData) {
    try {
      // resetAppOwner deletes all local data for this database
      // Use reload: false to prevent page refresh (we handle navigation ourselves)
      await instance.resetAppOwner({ reload: false });
    } catch (error) {
      console.error(`Failed to reset database for tab ${tabId}:`, error);
    }
  }
  
  // Remove from cache (will be garbage collected)
  evoluInstances.delete(tabId);
}

// Check if a database instance exists for a tab
export function hasEvoluInstance(tabId: string): boolean {
  return evoluInstances.has(tabId);
}

// Invalidate and remove a cached Evolu instance for a tab
// This forces a new instance to be created on next access
// Used after restoreAppOwner to ensure fresh state
export function invalidateEvoluInstance(tabId: string): void {
  evoluInstances.delete(tabId);
}

// For backwards compatibility - the default instance
export const evolu = getEvoluForTab("default");
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
