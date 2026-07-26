/**
 * `require-scalar-reflect`
 *
 * `reflect: true` asks Lit to write the property back out to the attribute on
 * every change, using the converter's `toAttribute`. For `Object` and `Array`
 * that is `JSON.stringify`, so the DOM fills with long, quote-escaped blobs
 * that re-parse into fresh objects on the way back in — new identity every
 * update, and an update loop whenever the round trip is not exactly lossless.
 * Values that contain functions, `undefined`, or cycles do not survive at all.
 *
 * Reflect scalars. Keep structured data on the property only.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Converters whose `toAttribute` is `JSON.stringify`. */
/**
 * Converters that produce an attribute a browser can round-trip.
 *
 * The test is inverted on purpose: reflection is rejected unless the options
 * prove the value is one of these. Listing the complex converters instead let
 * the worst case through — `{reflect: true}` with no `type` at all, where the
 * identity converter writes `[object Object]` into the DOM.
 */
const SCALAR_TYPES: readonly string[] = ["String", "Number", "Boolean"];

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** One entry of an options object literal, by key. */
function optionEntry(
  options: Deno.lint.Expression | undefined | null,
  name: string,
): Deno.lint.Property | null {
  if (!options || options.type !== "ObjectExpression") return null;
  for (const entry of options.properties) {
    if (entry.type !== "Property") continue;
    if (objectKeyName(entry.key) === name) return entry;
  }
  return null;
}

/** The options object passed to `@property({...})`, if it is a literal. */
function decoratorOptions(
  decorator: Deno.lint.Decorator,
): Deno.lint.ObjectExpression | null {
  const expression = decorator.expression;
  if (expression.type !== "CallExpression") return null;
  const first = expression.arguments[0];
  if (!first || first.type !== "ObjectExpression") return null;
  return first;
}

/**
 * The offending `reflect: true` entry, when nothing in the options proves the
 * reflected value is a scalar.
 */
function violation(
  options: Deno.lint.Expression | null,
): { node: Deno.lint.Property } | null {
  const reflect = optionEntry(options, "reflect");
  if (!reflect) return null;
  const flag = reflect.value as Deno.lint.Expression;
  if (flag.type !== "Literal" || flag.value !== true) return null;

  // A custom converter decides its own attribute form; take its word for it.
  if (optionEntry(options, "converter")) return null;

  const type = optionEntry(options, "type");
  if (!type) return { node: reflect };

  const converter = type.value as Deno.lint.Expression;
  // A `type` we cannot read — `TYPES.obj`, a variable — is not evidence.
  if (converter.type !== "Identifier") return { node: reflect };
  if (SCALAR_TYPES.includes(converter.name)) return null;

  return { node: reflect };
}

/**
 * Rejects `reflect: true` combined with `{type: Object}` or `{type: Array}`.
 */
export const requireScalarReflect: Deno.lint.Rule = {
  create(ctx) {
    function report(
      found: { node: Deno.lint.Property },
      name: string,
    ): void {
      ctx.report({
        node: found.node,
        message:
          `Property "${name}" reflects a value that is not a declared scalar.`,
        hint:
          "Reflection writes the value into the DOM as a string. Declare type: String, Number or Boolean, supply a converter, or drop reflect.",
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node, ctx)) return;
      for (const member of classMembers(node)) {
        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }

        const decorator = findDecorator(member.decorators ?? [], "property");
        if (decorator) {
          const found = violation(decoratorOptions(decorator));
          const name = keyName(member.key);
          if (found && name !== null) report(found, name);
          continue;
        }

        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name === null) continue;
          const found = violation(entry.value as Deno.lint.Expression);
          if (found) report(found, name);
        }
      }
    }

    return {
      ClassDeclaration(node) {
        check(node);
      },
      ClassExpression(node) {
        check(node);
      },
    };
  },
};
