// The demo site's content: a small fictional studio. Editing this file and running `npm run db:seed` changes what the site shows;
// the E2E suite's expectations live in e2e/support/site-contract.ts and are written to survive a change of copy.
import type { SectionKind } from "../content/model.ts";

export interface SeedItem {
  label: string;
  body: string;
  href?: string;
}
export interface SeedSection {
  kind: SectionKind;
  heading: string;
  body?: string;
  cta?: { label: string; href: string };
  items?: SeedItem[];
}
export interface SeedPage {
  slug: string;
  title: string;
  heading: string;
  intro?: string;
  nav?: { label: string; position: number };
  published?: boolean;
  sections: SeedSection[];
}

const text = (heading: string, body: string): SeedSection => ({ kind: "text", heading, body });

export const seedPages: readonly SeedPage[] = [
  {
    slug: "/",
    title: "Lantern Studio | Websites that stay fast",
    heading: "Websites that stay fast and easy to edit",
    intro: "Lantern Studio builds and looks after small business websites.",
    sections: [
      {
        kind: "hero",
        heading: "Websites that stay fast and easy to edit",
        body: "Lantern Studio builds and looks after small business websites, so your team can change the words without calling us.",
        cta: { label: "Book a call", href: "/contact" },
      },
      {
        kind: "services",
        heading: "Services",
        body: "Pick a service to see what is included.",
        items: [
          { label: "Audit", body: "We read your site the way a visitor and a search engine do, and hand you a short list of fixes in priority order.", href: "/services/audit" },
          { label: "Build", body: "A new site or a rebuild on a stack your team can maintain, with a content editor that matches how you work.", href: "/services/build" },
          { label: "Care", body: "Monthly updates, backups, monitoring and small changes, so the site does not drift while you run the business.", href: "/services/care" },
        ],
      },
      {
        kind: "steps",
        heading: "How it works",
        body: "Three steps, each with something you can review.",
        items: [
          { label: "Brief", body: "A thirty minute call and a one page summary of what the site must do and for whom." },
          { label: "Build", body: "Weekly previews of the real site, not mock-ups, so you can correct course early." },
          { label: "Launch", body: "A checklist run before the switch, a quiet rollout, and a week of watching the numbers with you." },
        ],
      },
      text(
        "Recent results",
        "A neighbourhood bakery cut its page weight by two thirds and saw online orders rise the same month.\n\nA small clinic replaced a booking form that failed on phones; the number of abandoned bookings fell by half.",
      ),
      {
        kind: "contact",
        heading: "Contact",
        body: "Tell us about your site and we reply within two working days.",
        cta: { label: "Contact us", href: "/contact" },
      },
    ],
  },
  {
    slug: "/about",
    title: "About | Lantern Studio",
    heading: "About the studio",
    intro: "A small team that prefers plain, maintainable sites.",
    nav: { label: "About", position: 1 },
    sections: [
      text("Who we are", "Lantern Studio is four people who build websites for owner-run businesses."),
      text("How we work", "We write things down, ship small changes often, and leave the site in a state your next developer can read."),
    ],
  },
  {
    slug: "/pricing",
    title: "Pricing | Lantern Studio",
    heading: "Pricing",
    intro: "Fixed prices for the common jobs.",
    nav: { label: "Pricing", position: 2 },
    sections: [
      text("Fixed price work", "Audits and small builds have a fixed price agreed after the first call."),
      text("Monthly care", "Care plans are billed monthly and can be stopped with a month's notice."),
    ],
  },
  {
    slug: "/contact",
    title: "Contact | Lantern Studio",
    heading: "Contact us",
    intro: "The quickest way to reach the studio.",
    nav: { label: "Contact", position: 3 },
    sections: [text("Write to us", "Describe the site, what is not working, and when you would like it fixed.")],
  },
  {
    slug: "/privacy",
    title: "Privacy | Lantern Studio",
    heading: "Privacy",
    intro: "What this demonstration site keeps.",
    sections: [text("What we keep", "This is a demonstration site. It stores no visitor data.")],
  },
  {
    slug: "/services/audit",
    title: "Site audit | Lantern Studio",
    heading: "Site audit",
    sections: [text("What you get", "A written report with each finding, why it matters and what to change first.")],
  },
  {
    slug: "/services/build",
    title: "New site or rebuild | Lantern Studio",
    heading: "New site or rebuild",
    sections: [text("What you get", "A site you can edit yourself, with previews every week until launch.")],
  },
  {
    slug: "/services/care",
    title: "Care plans | Lantern Studio",
    heading: "Care plans",
    sections: [text("What you get", "Updates, backups and monitoring, with a monthly note on what changed.")],
  },
  {
    slug: "/drafts/spring-offer",
    title: "Spring offer | Lantern Studio",
    heading: "Spring offer",
    published: false,
    sections: [text("Not yet", "An unpublished page: the site must answer 404 for it.")],
  },
];
