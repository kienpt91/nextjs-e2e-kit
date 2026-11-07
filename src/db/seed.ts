import type { Pool } from "./pool.ts";
import type { SeedPage } from "./seed-data.ts";

export interface SeedResult {
  pages: number;
  sections: number;
  items: number;
}

/**
 * Writes the pages into the database. It can run any number of times: a page is found by its slug and updated, and the sections
 * and items of a seeded page are replaced, so the result never depends on what was there before. Pages that are not in the list
 * are left alone.
 */
export async function seedContent(pool: Pool, pages: readonly SeedPage[]): Promise<SeedResult> {
  const client = await pool.connect();
  const result: SeedResult = { pages: 0, sections: 0, items: 0 };
  try {
    await client.query("BEGIN");
    for (const page of pages) {
      const row = await client.query<{ id: number }>(
        `INSERT INTO pages (slug, title, heading, intro, nav_label, nav_position, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, heading = EXCLUDED.heading, intro = EXCLUDED.intro,
           nav_label = EXCLUDED.nav_label, nav_position = EXCLUDED.nav_position, published = EXCLUDED.published
         RETURNING id`,
        [page.slug, page.title, page.heading, page.intro ?? "", page.nav?.label ?? null, page.nav?.position ?? null, page.published ?? true],
      );
      const pageId = row.rows[0]?.id;
      if (pageId === undefined) throw new Error(`no id returned for ${page.slug}`);
      result.pages += 1;
      await client.query("DELETE FROM sections WHERE page_id = $1", [pageId]);
      let position = 0;
      for (const section of page.sections) {
        position += 1;
        const inserted = await client.query<{ id: number }>(
          "INSERT INTO sections (page_id, position, kind, heading, body, cta_label, cta_href) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
          [pageId, position, section.kind, section.heading, section.body ?? "", section.cta?.label ?? null, section.cta?.href ?? null],
        );
        const sectionId = inserted.rows[0]?.id;
        if (sectionId === undefined) throw new Error(`no id returned for a section of ${page.slug}`);
        result.sections += 1;
        let itemPosition = 0;
        for (const item of section.items ?? []) {
          itemPosition += 1;
          await client.query("INSERT INTO section_items (section_id, position, label, body, href) VALUES ($1, $2, $3, $4, $5)", [
            sectionId,
            itemPosition,
            item.label,
            item.body,
            item.href ?? null,
          ]);
          result.items += 1;
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return result;
}
