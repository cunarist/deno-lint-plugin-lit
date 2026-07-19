import { noClassfieldShadowing } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-classfield-shadowing", noClassfieldShadowing);

Deno.test("no-classfield-shadowing: allows unrelated fields", () => {
  assertValid(
    plugin,
    `class Base extends LitElement {
      @property() name = "";
    }
    class El extends Base {
      other = 1;
    }`,
  );
});

Deno.test("no-classfield-shadowing: allows a declare redeclaration", () => {
  assertValid(
    plugin,
    `class Base extends LitElement {
      @property() name = "";
    }
    class El extends Base {
      declare name: string;
    }`,
  );
});

Deno.test("no-classfield-shadowing: ignores classes outside a Lit chain", () => {
  assertValid(
    plugin,
    `class Base {
      @property() name = "";
    }
    class El extends Base {
      name = "x";
    }`,
  );
});

Deno.test("no-classfield-shadowing: rejects shadowing an inherited property", () => {
  assertInvalid(
    plugin,
    `class Base extends LitElement {
      @property() name = "";
    }
    class El extends Base {
      name = "x";
    }`,
  );
});

Deno.test("no-classfield-shadowing: rejects shadowing through an exported base", () => {
  assertInvalid(
    plugin,
    `export class Base extends LitElement {
      @state() open = false;
    }
    export class El extends Base {
      open = true;
    }`,
  );
});

Deno.test("no-classfield-shadowing: rejects shadowing across two levels", () => {
  assertInvalid(
    plugin,
    `class Base extends LitElement {
      @property() name = "";
    }
    class Middle extends Base {}
    class El extends Middle {
      name = "x";
    }`,
  );
});

Deno.test("no-classfield-shadowing: rejects shadowing static properties on the same class", () => {
  assertInvalid(
    plugin,
    `class El extends LitElement {
      static properties = { name: { type: String } };
      name = "x";
    }`,
  );
});

Deno.test("no-classfield-shadowing: highlights the shadowing field name", () => {
  const code = `class Base extends LitElement {
  @property() name = "";
}
class El extends Base {
  name = "x";
}`;
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "name");
});
