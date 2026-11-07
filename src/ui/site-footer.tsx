import Link from "next/link";
import type { Fault } from "../faults.ts";
import type { SitemapEntry } from "../content/model.ts";

export function SiteFooter({ pages, fault }: { pages: SitemapEntry[]; fault: Fault | null }) {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer">
        <ul>
          {pages.map((page) => (
            <li key={page.slug}>
              <Link href={page.slug}>{page.slug === "/" ? "Home" : page.heading}</Link>
            </li>
          ))}
          {fault === "broken-link" && (
            <li>
              <Link href="/pricing-old">Old pricing</Link>
            </li>
          )}
        </ul>
      </nav>
      <p>
        <small>
          Lantern Studio is a fictional business in a demonstration site. <Link href="/privacy">Privacy policy</Link>
        </small>
      </p>
    </footer>
  );
}
