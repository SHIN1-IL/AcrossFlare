"use client";

import { useSyncExternalStore } from "react";

let nowSnapshot = 0;

function subscribeNow(onStoreChange: () => void) {
  nowSnapshot = Date.now();
  const id = window.setInterval(() => {
    nowSnapshot = Date.now();
    onStoreChange();
  }, 250);
  return () => window.clearInterval(id);
}

export function useNow() {
  return useSyncExternalStore(subscribeNow, () => nowSnapshot, () => 0);
}
