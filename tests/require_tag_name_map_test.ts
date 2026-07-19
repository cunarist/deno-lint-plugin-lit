import { requireTagNameMap } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-tag-name-map", requireTagNameMap);

Deno.test("require-tag-name-map: allows a registered class with its entry", () => {
  assertValid(
    plugin,
    `declare global {
       interface HTMLElementTagNameMap {
         "cl-path-bar": PathBar;
       }
     }
     @customElement("cl-path-bar")
     export class PathBar extends LitElement {}`,
  );
});

Deno.test("require-tag-name-map: allows the entry declared after the class", () => {
  assertValid(
    plugin,
    `@customElement("cl-path-bar")
     export class PathBar extends LitElement {}
     declare global {
       interface HTMLElementTagNameMap { "cl-path-bar": PathBar; }
     }`,
  );
});

Deno.test("require-tag-name-map: ignores unregistered classes", () => {
  assertValid(plugin, "export class PathBar extends LitElement {}");
  assertValid(plugin, '@customElement("cl-path-bar") class PathBar {}');
});

Deno.test("require-tag-name-map: rejects a missing augmentation", () => {
  assertInvalid(
    plugin,
    `@customElement("cl-path-bar")
     export class PathBar extends LitElement {}`,
  );
});

Deno.test("require-tag-name-map: rejects an entry for a different tag", () => {
  assertInvalid(
    plugin,
    `declare global {
       interface HTMLElementTagNameMap { "cl-side-bar": PathBar; }
     }
     @customElement("cl-path-bar")
     export class PathBar extends LitElement {}`,
  );
});

Deno.test("require-tag-name-map: rejects an entry mapped to another class", () => {
  assertInvalid(
    plugin,
    `declare global {
       interface HTMLElementTagNameMap { "cl-path-bar": SideBar; }
     }
     @customElement("cl-path-bar")
     export class PathBar extends LitElement {}`,
  );
});

Deno.test("require-tag-name-map: reports each unmapped component", () => {
  assertInvalid(
    plugin,
    `@customElement("cl-a") export class A extends LitElement {}
     @customElement("cl-b") export class B extends LitElement {}`,
    2,
  );
});

Deno.test("require-tag-name-map: highlights the registered tag", () => {
  const code =
    '@customElement("cl-path-bar")\nexport class PathBar extends LitElement {}';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"cl-path-bar"');
});
