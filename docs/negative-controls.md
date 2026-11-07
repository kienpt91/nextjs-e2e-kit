# Negative controls: proof that the tests can fail

A passing suite says the behaviour works only if the tests would fail when it does not. This kit shows it instead of asserting it: the demo site can be started with one behaviour broken at a time (`DEMO_FAULT=<name>`), and `scripts/negative-controls.sh` runs the whole suite against each broken site and checks that **exactly** the tests that guard that behaviour fail, no more and no fewer. The latest transcript is `docs/negative-controls-output.txt`.

```sh
scripts/negative-controls.sh                       # all faults, about four minutes
scripts/with-postgres.sh "npm run db:migrate && npm run db:seed && npm run build && DEMO_FAULT=menu-no-focus-return npx playwright test --project=mobile"
                                                   # one fault by hand, to read the failure
```

A fault is only the behaviour the requirement is about, broken in the most ordinary way it breaks in real projects.

| Fault | What is broken | Tests that must fail (tag) |
| --- | --- | --- |
| `wrong-title` | the homepage `<title>` is "Untitled" | `@titles` (the homepage only) |
| `section-order` | the sections below the hero come out in reverse order | `@home-sections` |
| `broken-link` | the footer links to `/pricing-old`, which does not exist | `@links` (the message names the page that has the link) |
| `soft-404` | a missing or unpublished page shows the "not found" content with status 200 | `@not-found` (4 tests) |
| `header-never-solid` | the header stays transparent after scrolling | `@header` |
| `menu-no-escape` | Escape does nothing in the open menu | `@menu-escape`, `@menu-focus-return` (the second needs Escape to close it) |
| `menu-no-focus-return` | the menu closes but focus is not given back to the Menu button | `@menu-focus-return` (Escape and the Close button) |
| `menu-no-focus-trap` | Tab leaves the open dialog for the page behind it | `@menu-focus-trap` |
| `tabs-no-arrow-keys` | Left, Right, Home and End do nothing on the tabs | `@tabs-keyboard` |
| `tabs-selection-not-exposed` | every tab says `aria-selected="false"`, the panel still changes | `@tabs-aria` |
| `steps-clipped` | the step buttons are wider than the phone, the last one is cut off | `@steps` |
| `wide-element` | on `/pricing` an element sticks out of the right edge, so the page scrolls sideways at 375 px | `@no-overflow` (the `/pricing` test only) |
| `contact-bar-not-fixed` | the contact bar is part of the page flow at the very end, not fixed to the screen | `@contact-bar` |
| `contact-bar-covers-footer` | the bar stays fixed but the page has no room under the footer, so it covers the last link | `@contact-bar-clearance` |
| `reduced-motion-ignored` | sections that fade in stay hidden for a visitor who asked for reduced motion | `@reduced-motion` |

The plan is `scripts/negative-control-lib.ts`; `test/unit/negative-control-lib.test.ts` checks that it names every fault and that a run where nothing fails, where an unrelated test fails, or where a failing test has no tag is rejected.

## What it found when it was first run

- A fault that failed tests it should not have touched. `section-order` made the two motion tests fail, because they assumed the section named "contact" is the last one and so below the fold. They now take the last region of the page, whichever it is.
- A fault that failed nothing. `contact-bar-covers-footer` removed the page padding under the footer, but the footer was tall enough to clear the bar by accident (the link was 56 px above the bottom, the bar is 56 px high). The footer was made tighter so the padding is what keeps the link clear.
- A fault that failed everything on a phone. The first version of `wide-element` put the sticking-out element on every page. A phone browser widens the layout when something sticks out, so the fixed header, the menu button and the contact bar moved with it and 16 of the 50 tests failed. That is what happens on a real phone, and the demo now puts the element on one page and asserts only that page.

## Adding a control

1. Add the name to `FAULTS` in `src/faults.ts`, and the branch that breaks the behaviour (a CSS override in `faultCss` for a layout fault, a condition where the behaviour lives otherwise).
2. Add the tags of the tests that must fail to `plan` in `scripts/negative-control-lib.ts`. If a test fails in a fault that is not its own, either the test is checking two things (split it) or the fault breaks more than one behaviour (it is a different fault).
3. Run `scripts/negative-controls.sh` and paste the result into `docs/negative-controls-output.txt`.

## What this does not show

It does not show that the suite catches every way the behaviour can break; it shows it catches the ways listed. It is not mutation testing: the faults were chosen by hand from the requirements. The fault code lives in the demo site's source and has to be removed when the suite is adopted by another site (`docs/adapting.md`, section 8).
