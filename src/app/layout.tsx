import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { loadNavigation, loadSitemap } from "../content/server.ts";
import { faultCss, parseFault } from "../faults.ts";
import { HydrationFlag } from "../ui/hydration-flag.tsx";
import { QuickContactBar } from "../ui/quick-contact-bar.tsx";
import { SiteFooter } from "../ui/site-footer.tsx";
import { SiteHeader } from "../ui/site-header.tsx";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lantern Studio" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const fault = parseFault(process.env["DEMO_FAULT"]);
  const [navigation, sitemap] = await Promise.all([loadNavigation(), loadSitemap()]);
  const css = faultCss(fault);
  return (
    <html lang="en">
      <body>
        <HydrationFlag />
        {css !== "" && <style>{css}</style>}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader links={navigation} fault={fault} />
        {children}
        <SiteFooter pages={sitemap} fault={fault} />
        <QuickContactBar />
      </body>
    </html>
  );
}
