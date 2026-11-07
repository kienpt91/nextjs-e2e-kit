"use client";

import { useEffect } from "react";

/**
 * Marks the document once React has attached its handlers. The suite waits for it (e2e/support/app.ts) so that a click or a key
 * press is never sent to markup whose handlers are not there yet, which is the usual cause of flaky tests on a server-rendered site.
 */
export function HydrationFlag() {
  useEffect(() => {
    document.documentElement.dataset["hydrated"] = "true";
  }, []);
  return null;
}
