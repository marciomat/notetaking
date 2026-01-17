"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Create the Evolu instance with sync enabled
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow("notetaking"),
  // Enable sync via Evolu's relay server
  transports: [{ type: "WebSocket", url: "wss://relay.evolu.dev" }],
});

// Create typed hook for accessing Evolu
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
