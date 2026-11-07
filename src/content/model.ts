// The content the site renders, and the port the rendering code reads it through. No SQL and no framework in this file.

export type SectionKind = "hero" | "services" | "steps" | "text" | "contact";

export interface SectionItem {
  label: string;
  body: string;
  href: string | null;
}

export interface Section {
  position: number;
  kind: SectionKind;
  heading: string;
  /** Anchor the section can be linked by, derived from the heading ("How it works" gives "how-it-works"). */
  anchor: string;
  body: string;
  cta: { label: string; href: string } | null;
  items: SectionItem[];
}

export interface Page {
  slug: string;
  title: string;
  heading: string;
  intro: string;
  sections: Section[];
}

export interface NavLink {
  href: string;
  label: string;
}

export interface SitemapEntry {
  slug: string;
  title: string;
  heading: string;
}

export interface ContentRepository {
  /** The page for a slug, or null when it does not exist or is not published. */
  findPublishedPage(slug: string): Promise<Page | null>;
  /** Header links in their editorial order. */
  listNavigation(): Promise<NavLink[]>;
  /** Every published page, the homepage first, then by slug. */
  listSitemap(): Promise<SitemapEntry[]>;
}

export function anchorFor(heading: string): string {
  return heading
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG = /^\/[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;

/** The slug of a request path, or null for anything that cannot be a slug (so it is never sent to the database). */
export function slugFromPathSegments(segments: readonly string[] | undefined): string | null {
  if (segments === undefined || segments.length === 0) return "/";
  const slug = `/${segments.join("/")}`;
  return SLUG.test(slug) ? slug : null;
}
