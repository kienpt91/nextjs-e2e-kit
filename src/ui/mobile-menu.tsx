"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Fault } from "../faults.ts";
import type { NavLink } from "../content/model.ts";

const FOCUSABLE = "a[href], button:not([disabled])";

/** A button that opens a modal dialog with the site links. Escape and the close button close it and give focus back to the button. */
export function MobileMenu({ links, fault }: { links: NavLink[]; fault: Fault | null }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus && fault !== "menu-no-focus-return") opener.current?.focus();
    },
    [fault],
  );

  useEffect(() => {
    if (!open) return;
    closer.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && fault !== "menu-no-escape") {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, fault]);

  // following a link replaces the page: the menu goes away without taking focus back to a button that has just been navigated from
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || fault === "menu-no-focus-trap" || dialog.current === null) return;
    const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="menu-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        Menu
      </button>
      {open && (
        <div ref={dialog} id="mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu" onKeyDown={trapTab}>
          <div className="mobile-menu__bar">
            <span className="mobile-menu__brand">Lantern Studio</span>
            <button ref={closer} type="button" className="menu-button" onClick={() => close(true)}>
              Close menu
            </button>
          </div>
          <nav aria-label="Mobile">
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
