import { noEventTargetSubclass } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-event-target-subclass", noEventTargetSubclass);

Deno.test("no-event-target-subclass: rejects a state bus", () => {
  assertInvalid(plugin, "class Store extends EventTarget {}");
});

Deno.test("no-event-target-subclass: allows other base classes", () => {
  assertValid(plugin, "class El extends LitElement {}");
  assertValid(plugin, "class C implements ReactiveController {}");
});

Deno.test("no-event-target-subclass: ignores indirect inheritance", () => {
  // LitElement reaches EventTarget through HTMLElement; only a direct
  // `extends EventTarget` is the state-bus pattern this targets.
  assertValid(plugin, "class El extends HTMLElement {}");
});

Deno.test("no-event-target-subclass: highlights the base class", () => {
  const code = "class Store extends EventTarget {}";
  const [d] = assertInvalid(plugin, code);
  if (!d) throw new Error("expected a diagnostic");
  assertReportedText(code, d, "EventTarget");
});
