import type { Pool } from "../db/pool.ts";
import { anchorFor } from "./model.ts";
import type { ContentRepository, NavLink, Page, Section, SectionItem, SectionKind, SitemapEntry } from "./model.ts";

interface PageRow {
  id: number;
  slug: string;
  title: string;
  heading: string;
  intro: string;
}
interface SectionRow {
  id: number;
  position: number;
  kind: SectionKind;
  heading: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
}
interface ItemRow {
  section_id: number;
  label: string;
  body: string;
  href: string | null;
}

export class PgContentRepository implements ContentRepository {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async findPublishedPage(slug: string): Promise<Page | null> {
    const page = (
      await this.#pool.query<PageRow>("SELECT id, slug, title, heading, intro FROM pages WHERE slug = $1 AND published", [slug])
    ).rows[0];
    if (page === undefined) return null;
    const sections = (
      await this.#pool.query<SectionRow>(
        "SELECT id, position, kind, heading, body, cta_label, cta_href FROM sections WHERE page_id = $1 ORDER BY position",
        [page.id],
      )
    ).rows;
    const items = (
      await this.#pool.query<ItemRow>(
        "SELECT section_id, label, body, href FROM section_items WHERE section_id = ANY($1::int[]) ORDER BY section_id, position",
        [sections.map((s) => s.id)],
      )
    ).rows;
    const bySection = new Map<number, SectionItem[]>();
    for (const item of items) {
      const list = bySection.get(item.section_id) ?? [];
      list.push({ label: item.label, body: item.body, href: item.href });
      bySection.set(item.section_id, list);
    }
    return {
      slug: page.slug,
      title: page.title,
      heading: page.heading,
      intro: page.intro,
      sections: sections.map(
        (s): Section => ({
          position: s.position,
          kind: s.kind,
          heading: s.heading,
          anchor: anchorFor(s.heading),
          body: s.body,
          cta: s.cta_label !== null && s.cta_href !== null ? { label: s.cta_label, href: s.cta_href } : null,
          items: bySection.get(s.id) ?? [],
        }),
      ),
    };
  }

  async listNavigation(): Promise<NavLink[]> {
    const rows = await this.#pool.query<{ slug: string; nav_label: string }>(
      "SELECT slug, nav_label FROM pages WHERE published AND nav_position IS NOT NULL ORDER BY nav_position",
    );
    return rows.rows.map((r) => ({ href: r.slug, label: r.nav_label }));
  }

  async listSitemap(): Promise<SitemapEntry[]> {
    const rows = await this.#pool.query<SitemapEntry>(
      "SELECT slug, title, heading FROM pages WHERE published ORDER BY (slug <> '/'), slug",
    );
    return rows.rows;
  }
}
