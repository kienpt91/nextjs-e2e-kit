-- The content model the demo site reads. It stands in for what a CMS keeps in its own tables: pages, the sections of a page in
-- order, and the items of a section (tabs, steps). Plain SQL, applied once each by src/db/migrate.ts.

CREATE TABLE pages (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug         text    NOT NULL UNIQUE
               CHECK (slug = '/' OR slug ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  title        text    NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  heading      text    NOT NULL CHECK (length(heading) BETWEEN 1 AND 120),
  intro        text    NOT NULL DEFAULT '',
  nav_label    text,
  nav_position integer,
  published    boolean NOT NULL DEFAULT true,
  CHECK ((nav_label IS NULL) = (nav_position IS NULL))
);

CREATE TABLE sections (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id   integer NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
  position  integer NOT NULL CHECK (position > 0),
  kind      text    NOT NULL CHECK (kind IN ('hero', 'services', 'steps', 'text', 'contact')),
  heading   text    NOT NULL CHECK (length(heading) BETWEEN 1 AND 120),
  body      text    NOT NULL DEFAULT '',
  cta_label text,
  cta_href  text,
  UNIQUE (page_id, position),
  CHECK ((cta_label IS NULL) = (cta_href IS NULL))
);

CREATE TABLE section_items (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id integer NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
  position   integer NOT NULL CHECK (position > 0),
  label      text    NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  body       text    NOT NULL,
  href       text,
  UNIQUE (section_id, position)
);
