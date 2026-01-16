"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Create the Evolu instance
// Note: For static export, we don't use sync transports by default
// Users can sync via mnemonic restore on different devices
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow("notetaking"),
  // Uncomment and configure if you want to enable sync relay
  // transports: [{ type: "WebSocket", url: "wss://relay.evolu.dev" }],
});

// Create typed hook for accessing Evolu
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
