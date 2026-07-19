import { tagMatchesClassName } from "#naming";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("tag-matches-class-name", tagMatchesClassName);

Deno.test("tag-matches-class-name: allows a prefixed tag naming its class", () => {
  assertValid(
    plugin,
    '@customElement("cl-path-bar") export class PathBar extends LitElement {}',
  );
  assertValid(
    plugin,
    '@customElement("cl-md-slash-menu") export class SlashMenu extends LitElement {}',
  );
});

Deno.test("tag-matches-class-name: allows a tag with no prefix", () => {
  assertValid(
    plugin,
    '@customElement("path-bar") export class PathBar extends LitElement {}',
  );
});

Deno.test("tag-matches-class-name: ignores unregistered or non-Lit classes", () => {
  assertValid(plugin, "export class PathBar extends LitElement {}");
  assertValid(plugin, '@customElement("cl-side-bar") class PathBar {}');
});

Deno.test("tag-matches-class-name: rejects a tag naming another class", () => {
  assertInvalid(
    plugin,
    '@customElement("cl-path-bar") export class Sidebar extends LitElement {}',
  );
});

Deno.test("tag-matches-class-name: rejects a partial match", () => {
  assertInvalid(
    plugin,
    '@customElement("cl-path") export class PathBar extends LitElement {}',
  );
});

Deno.test("tag-matches-class-name: rejects a prefix-only match", () => {
  assertInvalid(
    plugin,
    '@customElement("cl-path-bar-extra") export class PathBar extends LitElement {}',
  );
});

Deno.test("tag-matches-class-name: highlights the registered tag", () => {
  const code =
    '@customElement("cl-path-bar") export class Sidebar extends LitElement {}';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"cl-path-bar"');
});
