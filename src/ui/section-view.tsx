import Link from "next/link";
import type { Fault } from "../faults.ts";
import type { Section } from "../content/model.ts";
import { Reveal } from "./reveal.tsx";
import { Stepper } from "./stepper.tsx";
import { Tabs } from "./tabs.tsx";

function Paragraphs({ text }: { text: string }) {
  return text
    .split(/\n{2,}/)
    .filter((p) => p !== "")
    .map((p) => <p key={p}>{p}</p>);
}

/** The first section of the homepage: a full-width band the header sits over. It is not animated, so it is there at once. */
export function HeroSection({ section }: { section: Section }) {
  const headingId = `${section.anchor}-heading`;
  return (
    <section id={section.anchor} className="hero" aria-labelledby={headingId}>
      <div className="hero__inner">
        <h1 id={headingId}>{section.heading}</h1>
        <Paragraphs text={section.body} />
        {section.cta !== null && (
          <Link href={section.cta.href} className="button">
            {section.cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}

export function ContentSection({ section, fault }: { section: Section; fault: Fault | null }) {
  const headingId = `${section.anchor}-heading`;
  return (
    <Reveal id={section.anchor} labelledBy={headingId} className="section" fault={fault}>
      <h2 id={headingId}>{section.heading}</h2>
      <Paragraphs text={section.body} />
      {section.kind === "services" && <Tabs label={section.heading} items={section.items} fault={fault} />}
      {section.kind === "steps" && <Stepper label={section.heading} items={section.items} />}
      {section.cta !== null && (
        <p>
          <Link href={section.cta.href} className="button">
            {section.cta.label}
          </Link>
        </p>
      )}
    </Reveal>
  );
}
