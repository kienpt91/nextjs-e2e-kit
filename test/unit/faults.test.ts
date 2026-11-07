import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FAULTS, WIDE_ELEMENT_PAGE, faultCss, parseFault, wideElementCss } from "../../src/faults.ts";

describe("parseFault", () => {
  test("nothing or an empty value is no fault", () => {
    assert.equal(parseFault(undefined), null);
    assert.equal(parseFault(""), null);
  });

  test("a known name is returned", () => {
    for (const fault of FAULTS) assert.equal(parseFault(fault), fault);
  });

  test("a name that is not known is an error that lists the choices, so a typo never runs the healthy site", () => {
    assert.throws(() => parseFault("wrong_title"), /not one of: wrong-title, /);
  });
});

describe("faultCss", () => {
  test("only the layout and motion faults add CSS to every page; the wide element is added by one page", () => {
    const withCss = FAULTS.filter((f) => faultCss(f) !== "");
    assert.deepEqual(withCss.sort(), ["contact-bar-covers-footer", "contact-bar-not-fixed", "reduced-motion-ignored", "steps-clipped"]);
    assert.equal(faultCss(null), "");
    assert.equal(faultCss("wide-element"), "");
    assert.match(wideElementCss, /width:480px/);
    assert.match(WIDE_ELEMENT_PAGE, /^\/[a-z]+$/);
  });
});
