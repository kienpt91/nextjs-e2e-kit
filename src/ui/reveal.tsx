"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Fault } from "../faults.ts";

type State = "visible" | "pending" | "shown";

/**
 * A section that fades in when it scrolls into view. Without JavaScript, and for a visitor who asked for reduced motion, it is
 * simply there: hiding content behind an animation must never depend on the animation running.
 */
export function Reveal({ id, labelledBy, className, fault, children }: { id: string; labelledBy: string; className: string; fault: Fault | null; children: ReactNode }) {
  const [state, setState] = useState<State>("visible");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (fault !== "reduced-motion-ignored" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("shown");
      return;
    }
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [fault]);

  return (
    <section ref={ref} id={id} className={`reveal ${className}`} data-reveal={state} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
