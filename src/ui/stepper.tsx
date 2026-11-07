"use client";

import { useState } from "react";
import type { SectionItem } from "../content/model.ts";

/** Step buttons that fit a phone: one row, equal widths, touch targets of at least 48 pixels, the current step marked with aria-current. */
export function Stepper({ label, items }: { label: string; items: SectionItem[] }) {
  const [active, setActive] = useState(0);
  const current = items[active];
  return (
    <div className="stepper">
      <div role="group" aria-label={label} className="steps-nav" style={{ ["--steps" as string]: items.length }}>
        {items.map((item, index) => (
          <button key={item.label} type="button" aria-current={index === active ? "step" : undefined} onClick={() => setActive(index)}>
            Step {index + 1}: {item.label}
          </button>
        ))}
      </div>
      {current !== undefined && (
        <div className="steps-panel" aria-live="polite">
          <h3>
            Step {active + 1} of {items.length}: {current.label}
          </h3>
          <p>{current.body}</p>
        </div>
      )}
    </div>
  );
}
