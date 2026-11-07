# 0003. Wait for hydration before interacting

Status: accepted

## Context

A server-rendered React site sends markup first and attaches its event handlers a moment later. A test that clicks the Menu button as soon as it is visible can click markup that has no handler yet; the click is lost, the dialog never opens, and the test fails once in twenty runs. Retrying hides this; waiting for the button to be "stable" does not help because the button is stable.

## Decision

The root layout renders a client component (`src/ui/hydration-flag.tsx`) that sets `data-hydrated="true"` on `<html>` in an effect. Every test opens pages through `open()` (`e2e/support/app.ts`), which navigates and waits for that attribute. Tests that only read the response (status of a 404) use `request.get` and need no waiting.

## Consequences

- No test needs a fixed sleep, and there are no retries in the configuration.
- The site has to carry the flag. It is five lines; `docs/adapting.md` shows the alternatives for a site that cannot (wait for a known interactive element, or assert after the first interaction with `expect(...).toPass()`).
- The flag is set after the first effect, not after every effect: a component that hydrates lazily (a dynamically imported widget) needs its own readiness signal.
