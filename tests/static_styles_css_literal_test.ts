import { staticStylesCssLiteral } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("static-styles-css-literal", staticStylesCssLiteral);

Deno.test("static-styles-css-literal: allows a direct css literal", () => {
  assertValid(
    plugin,
    [
      "class X extends LitElement {",
      "  static styles = css`:host { display: block; }`;",
      "}",
    ].join("\n"),
  );
});

Deno.test("static-styles-css-literal: ignores non-static and other members", () => {
  assertValid(plugin, "class X { styles = [a, b]; }");
  assertValid(plugin, "class X { static other = [a, b]; }");
  assertValid(plugin, "class X { declare static styles: CSSResult; }");
});

Deno.test("static-styles-css-literal: rejects an array of styles", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "class X { static styles = [base, css`p{}`]; }",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "`static styles` is an array.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("static-styles-css-literal: rejects a reference", () => {
  assertInvalid(plugin, "class X { static styles = sharedStyles; }");
  assertInvalid(plugin, "class X { static styles = theme.styles; }");
});

Deno.test("static-styles-css-literal: rejects other expressions", () => {
  assertInvalid(plugin, "class X { static styles = makeStyles(); }");
  assertInvalid(plugin, "class X { static styles = html`p{}`; }");
});

Deno.test("static-styles-css-literal: rejects interpolation in the css literal", () => {
  const code = "class X { static styles = css`${base} p{}`; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (
    diagnostic.message !==
      "`static styles` interpolates into the `css` template."
  ) {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
  assertReportedText(code, diagnostic, "base");
});

Deno.test("static-styles-css-literal: rejects a static getter", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    "class X { static get styles() { return css`p{}`; } }",
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (diagnostic.message !== "`static styles` is a getter.") {
    throw new Error(`unexpected message: ${diagnostic.message}`);
  }
});

Deno.test("static-styles-css-literal: highlights the offending value", () => {
  const code = "class X { static styles = [base, css`p{}`]; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "[base, css`p{}`]");
});
