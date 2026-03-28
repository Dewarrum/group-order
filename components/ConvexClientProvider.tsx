"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in the environment");
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }

  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={getConvexClient()} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
