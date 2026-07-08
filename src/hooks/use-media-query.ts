import { useSyncExternalStore } from "react";

function subscribe(query: string, onStoreChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener("change", onStoreChange);
  return () => { media.removeEventListener("change", onStoreChange); };
}

function getSnapshot(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Subscribes to a CSS media query and re-renders when it changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => getSnapshot(query),
    () => false,
  );
}
