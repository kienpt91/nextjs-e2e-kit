import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { slugFromPathSegments } from "../../content/model.ts";
import { loadPage } from "../../content/server.ts";
import { parseFault } from "../../faults.ts";
import { NOT_FOUND_TITLE, NotFoundContent } from "../../ui/not-found-content.tsx";
import { ContentSection, HeroSection } from "../../ui/section-view.tsx";

// Pages are read from the database on every request, so an editor's change shows without a rebuild and the fault switch is read at run time.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug?: string[] }> };

async function find(props: Props) {
  const slug = slugFromPathSegments((await props.params).slug);
  return slug === null ? null : loadPage(slug);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const fault = parseFault(process.env["DEMO_FAULT"]);
  const page = await find(props);
  if (page === null) return { title: NOT_FOUND_TITLE };
  if (fault === "wrong-title" && page.slug === "/") return { title: "Untitled" };
  return { title: page.title, description: page.intro === "" ? undefined : page.intro };
}

export default async function ContentPage(props: Props) {
  const fault = parseFault(process.env["DEMO_FAULT"]);
  const page = await find(props);
  if (page === null) {
    // The fault is the classic "soft 404": a friendly page that answers 200.
    if (fault === "soft-404") return <NotFoundContent />;
    notFound();
  }
  const [first, ...rest] = page.sections;
  const hero = first?.kind === "hero" ? first : null;
  const content = hero === null ? page.sections : rest;
  const ordered = fault === "section-order" ? [...content].reverse() : content;
  return (
    <main id="main">
      {hero !== null ? (
        <HeroSection section={hero} />
      ) : (
        <div className="page-hero">
          <h1>{page.heading}</h1>
          {page.intro !== "" && <p>{page.intro}</p>}
        </div>
      )}
      {ordered.map((section) => (
        <ContentSection key={section.position} section={section} fault={fault} />
      ))}
    </main>
  );
}
