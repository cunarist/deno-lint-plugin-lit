/**
 * `require-tag-name-map`
 *
 * A class registered with `@customElement("x-y")` must also augment
 * `HTMLElementTagNameMap` in the same file, so `document.querySelector("x-y")`
 * and template type-checking know the element type.
 */

import {
  classDecorators,
  customElementTag,
  isLitComponent,
  memberPath,
} from "#helpers";

/** A component awaiting its tag-name-map entry. */
interface Registration {
  readonly tag: string;
  readonly className: string | null;
  readonly node: Deno.lint.Node;
}

/**
 * Structural view of the pieces of a tag-name-map entry we read. The TS type
 * nodes are reached through a narrow cast because Deno's typings for
 * `TSPropertySignature` do not expose them in a usable shape.
 */
interface EntryShape {
  readonly key?: { readonly type: string; readonly value?: unknown };
  readonly typeAnnotation?: {
    readonly typeAnnotation?: {
      readonly type: string;
      readonly typeName?: unknown;
    };
  };
}

/** The `"x-y"` literal node passed to `@customElement`, for reporting. */
function customElementTagNode(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.Node | null {
  for (const decorator of classDecorators(node)) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    if (memberPath(expression.callee) !== "customElement") continue;
    const first = expression.arguments[0];
    if (first && first.type === "Literal" && typeof first.value === "string") {
      return first;
    }
  }
  return null;
}

/** The type name a tag-name-map entry maps to, e.g. `PathBar`. */
function entryTypeName(entry: EntryShape): string | null {
  const annotation = entry.typeAnnotation?.typeAnnotation;
  if (!annotation || annotation.type !== "TSTypeReference") return null;
  const typeName = annotation.typeName;
  if (typeName === null || typeof typeName !== "object") return null;
  const named = typeName as { type?: string; name?: unknown };
  if (named.type !== "Identifier" || typeof named.name !== "string") {
    return null;
  }
  return named.name;
}

/**
 * Rejects a component registered with `@customElement` that has no matching
 * `HTMLElementTagNameMap` entry in the same file.
 */
export const requireTagNameMap: Deno.lint.Rule = {
  create(ctx) {
    /** Tag -> mapped type name, for every `HTMLElementTagNameMap` entry. */
    const entries = new Map<string, string | null>();
    const registrations: Registration[] = [];

    function collect(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isLitComponent(node)) return;
      const tag = customElementTag(node);
      if (tag === null) return;
      const target = customElementTagNode(node) ?? node;
      registrations.push({
        tag,
        className: node.id?.name ?? null,
        node: target,
      });
    }

    return {
      TSInterfaceDeclaration(node) {
        if (node.id.name !== "HTMLElementTagNameMap") return;
        for (const member of node.body.body) {
          if (member.type !== "TSPropertySignature") continue;
          const entry = member as unknown as EntryShape;
          const key = entry.key;
          if (!key || key.type !== "Literal") continue;
          if (typeof key.value !== "string") continue;
          entries.set(key.value, entryTypeName(entry));
        }
      },
      ClassDeclaration(node) {
        collect(node);
      },
      ClassExpression(node) {
        collect(node);
      },
      "Program:exit"() {
        for (const registration of registrations) {
          const { tag, className, node } = registration;
          if (!entries.has(tag)) {
            ctx.report({
              node,
              message: `No HTMLElementTagNameMap entry for "${tag}".`,
              hint:
                `Add \`declare global { interface HTMLElementTagNameMap { "${tag}": ${
                  className ?? "TheClass"
                } } }\` in this file.`,
            });
            continue;
          }
          const mapped = entries.get(tag) ?? null;
          if (className !== null && mapped !== null && mapped !== className) {
            ctx.report({
              node,
              message:
                `HTMLElementTagNameMap maps "${tag}" to \`${mapped}\`, not \`${className}\`.`,
              hint: `Map "${tag}" to \`${className}\`.`,
            });
          }
        }
      },
    };
  },
};
