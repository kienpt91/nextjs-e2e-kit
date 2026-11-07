// What the suite expects of the site, in one file. It is the only place to edit when the site's pages or headings change.
// Expectations are patterns on purpose: an editor who retitles "Services" to "Our services" must not break the build. See docs/adapting.md.

export interface PageExpectation {
  path: string;
  title: RegExp;
}

/** Every published page: where it lives and what its <title> must contain. */
export const publishedPages: readonly PageExpectation[] = [
  { path: "/", title: /Lantern Studio/ },
  { path: "/about", title: /^About\b/ },
  { path: "/pricing", title: /^Pricing\b/ },
  { path: "/contact", title: /^Contact\b/ },
  { path: "/privacy", title: /^Privacy\b/ },
  { path: "/services/audit", title: /audit/i },
  { path: "/services/build", title: /build/i },
  { path: "/services/care", title: /care/i },
];

/** Pages that exist in the CMS but are not published: the site must answer 404. */
export const unpublishedPaths: readonly string[] = ["/drafts/spring-offer"];

/** The homepage sections below the hero, in the order a visitor reads them. */
export const homeSections: readonly RegExp[] = [/services/i, /how it works/i, /results/i, /contact/i];

/** The links a visitor sees in the main navigation. */
export const mainNavigation: readonly RegExp[] = [/about/i, /pricing/i, /contact/i];
