"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks";

/**
 * True when scroll-linked effects should run: after hydration (so server and client
 * markup match) and only for visitors who haven't asked for reduced motion.
 * Components render their plain, static version whenever this is false.
 */
export function useFx() {
  const reduce = useReducedMotion();
  return useHydrated() && !reduce;
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

/** Live `matchMedia` result; false on the server. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}
