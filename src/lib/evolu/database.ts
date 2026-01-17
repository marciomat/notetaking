"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Create the Evolu instance with sync enabled via the free Evolu relay
// Evolu automatically adds the ownerId to the WebSocket URL when connecting
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow("notetaking"),
  transports: [{ type: "WebSocket", url: "wss://free.evoluhq.com" }],
});

// Create typed hook for accessing Evolu
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
