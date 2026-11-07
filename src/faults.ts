// Faults the DEMO SITE can be started with, only so that the negative controls can show the suite failing when a behaviour is
// broken (docs/negative-controls.md). Nothing is on unless DEMO_FAULT names it. A real site that adopts the suite should delete
// this file and the places that read it (src/app/layout.tsx, src/app/[[...slug]]/page.tsx and src/ui) and keep the suite.

export const FAULTS = [
  "wrong-title",
  "section-order",
  "broken-link",
  "soft-404",
  "header-never-solid",
  "menu-no-escape",
  "menu-no-focus-return",
  "menu-no-focus-trap",
  "tabs-no-arrow-keys",
  "tabs-selection-not-exposed",
  "steps-clipped",
  "wide-element",
  "contact-bar-not-fixed",
  "contact-bar-covers-footer",
  "reduced-motion-ignored",
] as const;

export type Fault = (typeof FAULTS)[number];

/** No value means no fault; a value that is not a known fault is an error, so a typo never runs the healthy site by accident. */
export function parseFault(value: string | undefined): Fault | null {
  if (value === undefined || value === "") return null;
  const fault = FAULTS.find((f) => f === value);
  if (fault === undefined) throw new Error(`DEMO_FAULT "${value}" is not one of: ${FAULTS.join(", ")}`);
  return fault;
}

/** The one page that has the element sticking out when the fault is "wide-element" (CSS in wideElementCss, added by that page). */
export const WIDE_ELEMENT_PAGE = "/pricing";

/** A decorative element that sticks out of the right edge: the classic cause of a sideways scroll on a phone. */
export const wideElementCss = 'main{position:relative}main::after{content:"";position:absolute;top:0;left:0;width:480px;height:1px}';

/** CSS that is added to every page for the faults that are about layout and motion. */
export function faultCss(fault: Fault | null): string {
  switch (fault) {
    case "steps-clipped":
      return ".steps-nav{display:flex!important;overflow:hidden}.steps-nav button{flex:0 0 180px!important}";
    case "contact-bar-not-fixed":
      return ".quick-contact{position:static!important}";
    case "contact-bar-covers-footer":
      return "body{padding-bottom:0!important}";
    case "reduced-motion-ignored":
      return '.reveal[data-reveal="pending"]{opacity:0!important;transform:translateY(24px)!important}';
    default:
      return "";
  }
}
