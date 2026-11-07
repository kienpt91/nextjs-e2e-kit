"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Fault } from "../faults.ts";
import type { NavLink } from "../content/model.ts";
import { MobileMenu } from "./mobile-menu.tsx";

/** Pixels of scrolling after which the header stops being transparent over the hero and becomes solid. */
const SOLID_AFTER_PX = 40;

export function SiteHeader({ links, fault }: { links: NavLink[]; fault: Fault | null }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    if (fault === "header-never-solid") return;
    const update = () => setSolid(window.scrollY > SOLID_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [fault]);

  return (
    <header className="site-header" data-solid={solid}>
      <Link href="/" className="site-header__brand">
        Lantern Studio
      </Link>
      <nav aria-label="Main" className="site-nav">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <MobileMenu links={links} fault={fault} />
    </header>
  );
}
