# 0001. Select elements by role and accessible name, never by class, id or test id

Status: accepted

## Context

A suite that finds things by `.btn-primary` or `#hero > div:nth-child(2)` breaks when a designer renames a class, and says nothing about whether a visitor can use the page. The people who edit a CMS site change copy and markup all the time. At the same time, the requirements of the suite (a dialog that gives focus back, tabs that answer to arrow keys, a navigation that has a name) are statements about what assistive technology sees.

## Decision

Every locator is `getByRole` with an accessible name (or a regular expression for it), `getByLabel`, or a query that starts from such a locator. Attributes are only read where the attribute is the behaviour: `aria-selected`, `aria-current`, `aria-expanded`, `tabindex` and `href`. `test/unit/architecture.test.ts` fails when a spec uses `getByTestId` or a class or id selector.

Names that are short enough to be a prefix of another ("Menu" and "Close menu") are matched with `exact: true`. Names that come from editors are matched with patterns that keep the key word and ignore the rest (`/services/i`).

## Consequences

- When a role query finds nothing, the page has an accessibility problem, and that is worth fixing in the page rather than working around with a test id.
- Tests read like the requirement ("the Menu button", "the Main menu dialog").
- A site whose components have no accessible names cannot adopt the suite without fixing them first. `docs/adapting.md` says how to go about it, and how to relax the rule for a legacy page (`getByTestId` with `testIdAttribute` set in the config) if the cost is too high.
