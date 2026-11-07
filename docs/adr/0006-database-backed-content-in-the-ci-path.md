# 0006. Content in PostgreSQL, migrated and seeded in the CI path

Status: accepted

## Context

A site on a headless CMS (Payload, Strapi, Directus) is a thin renderer over database rows: the homepage is a row of pages with an ordered list of blocks. An E2E suite for such a site that runs against fixtures in memory would test nothing that goes wrong in practice (a migration that was not applied, a seed that is not idempotent, an unpublished page that is served, sections that come back in the wrong order). A pipeline for such a site normally has a Postgres service for exactly that reason.

## Decision

The demo site reads `pages`, `sections` and `section_items` from PostgreSQL on every request (`force-dynamic`), through a repository port (`src/content/model.ts`) and a PostgreSQL implementation. CI does what a real pipeline for such a site does: wait for the database, apply the migrations (`npm run db:migrate`, with checksums and a lock), seed (`npm run db:seed`, idempotent), build, start, test. With the service missing, every test fails at the first request; with the seed missing, every page is a 404. The migration runner, the seed and the repository have their own integration tests against a real server.

## Consequences

- The suite exercises the same path as production: the order of sections is `ORDER BY position`, the 404 for a draft is `WHERE published`, the navigation is a query.
- An editor's change shows without a rebuild, which is also what makes the suite useful against staging.
- The kit does not reproduce a CMS. Replace the three tables and the seed with your CMS's own migrations and seed script; the suite needs only the site's URL and a database that has the same content every run.
