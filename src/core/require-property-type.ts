/**
 * `require-property-type`
 *
 * An attribute is always a string. `type` is what tells Lit to read it as
 * something else, so a reactive property that has an attribute must say which
 * conversion it wants. Without it Lit installs the identity converter and
 * `<my-el count="3">` leaves `count` holding `"3"`.
 *
 * The check is syntactic: it asks whether `type` is written, never what the
 * property's declared type is. That is deliberate. A rule that inferred the
 * type would have to give up on aliases, named types and generics — exactly
 * the cases where the mistake is easiest to make — and would quietly pass them.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
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
 * Whether the options settle how the attribute is read.
 *
 * `type` names a converter. `converter` supplies one directly, which overrides
 * whatever `type` would have selected. `attribute: false` removes the attribute
 * altogether, so no conversion ever runs. A spread could carry any of these, so
 * it is treated as settling the question rather than guessed at.
 */
function settlesConversion(options: Deno.lint.ObjectExpression): boolean {
  for (const entry of options.properties) {
    if (entry.type === "SpreadElement") return true;
    const name = objectKeyName(entry.key);
    if (name === "type" || name === "converter") return true;
    if (name === "attribute") {
      const value = entry.value;
      if (value.type === "Literal" && value.value === false) return true;
    }
  }
  return false;
}

/**
 * Requires `{type: …}` on every `@property` that has an attribute.
 */
export const requirePropertyType: Deno.lint.Rule = {
  create(ctx) {
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
        if (!decorator) continue;

        const options = decoratorOptions(decorator);
        if (options && settlesConversion(options)) continue;

        const name = keyName(member.key);
        if (name === null) continue;

        ctx.report({
          node: member.key,
          message: `Reactive property "${name}" declares no attribute type.`,
          hint: "An attribute arrives as a string. Add type: String, Number, " +
            "Boolean, Array or Object — or attribute: false if the property " +
            "is never set from markup.",
        });
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
