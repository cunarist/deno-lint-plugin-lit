import { requireDashedTag } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-dashed-tag", requireDashedTag);

Deno.test("require-dashed-tag: accepts a hyphenated lowercase name", () => {
  assertValid(
    plugin,
    '@customElement("cl-path-bar")\nclass PathBar extends LitElement {}',
  );
});

Deno.test("require-dashed-tag: rejects a name with no hyphen", () => {
  assertInvalid(
    plugin,
    '@customElement("editor")\nclass Editor extends LitElement {}',
  );
});

Deno.test("require-dashed-tag: rejects uppercase", () => {
  assertInvalid(
    plugin,
    '@customElement("my-Editor")\nclass Editor extends LitElement {}',
  );
});

Deno.test("require-dashed-tag: rejects a leading non-letter", () => {
  assertInvalid(
    plugin,
    '@customElement("-editor")\nclass Editor extends LitElement {}',
  );
});

Deno.test("require-dashed-tag: rejects a spec-reserved name", () => {
  assertInvalid(
    plugin,
    '@customElement("font-face")\nclass FontFace extends LitElement {}',
  );
});

Deno.test("require-dashed-tag: ignores a component with no @customElement", () => {
  // `@customElement` now marks a class as Lit, so the ignored case is a Lit
  // component that registers no tag at all — there is nothing to check.
  assertValid(plugin, "class Editor extends LitElement {}");
});

Deno.test("require-dashed-tag: highlights the tag literal", () => {
  const code = '@customElement("editor")\nclass Editor extends LitElement {}';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"editor"');
});
