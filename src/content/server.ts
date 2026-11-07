// The one place the running site gets its repository: a pool shared by every request of the server process, and results shared
// within a request, so the layout and the page do not ask the database for the same thing twice.
import { cache } from "react";
import { createPool, requireDatabaseUrl } from "../db/pool.ts";
import type { Pool } from "../db/pool.ts";
import type { ContentRepository } from "./model.ts";
import { PgContentRepository } from "./pg-content-repository.ts";

const globalForPool = globalThis as unknown as { __sitePool?: Pool };

function repository(): ContentRepository {
  globalForPool.__sitePool ??= createPool(requireDatabaseUrl(), 5);
  return new PgContentRepository(globalForPool.__sitePool);
}

export const loadPage = cache((slug: string) => repository().findPublishedPage(slug));
export const loadNavigation = cache(() => repository().listNavigation());
export const loadSitemap = cache(() => repository().listSitemap());
