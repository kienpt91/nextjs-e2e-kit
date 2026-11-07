"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Fault } from "../faults.ts";
import type { SectionItem } from "../content/model.ts";

/** WAI-ARIA tabs with automatic activation: arrow keys move focus and selection, Home and End jump, only the selected tab is in the tab order. */
export function Tabs({ label, items, fault }: { label: string; items: SectionItem[]; fault: Fault | null }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setActive(index);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (fault === "tabs-no-arrow-keys") return;
    const last = items.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div className="tabs">
      <div role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={fault === "tabs-selection-not-exposed" ? false : index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div key={item.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={index !== active}>
          <p>{item.body}</p>
          {item.href !== null && <Link href={item.href}>Learn more about {item.label.toLowerCase()}</Link>}
        </div>
      ))}
    </div>
  );
}
