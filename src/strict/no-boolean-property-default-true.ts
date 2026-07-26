/**
 * `no-boolean-property-default-true`
 *
 * Lit's `Boolean` converter follows the HTML rule: the attribute's *presence*
 * is `true` and its absence is `false`. There is no markup that says "false" —
 * `disabled="false"` and `disabled=""` both parse as `true`. So a boolean
 * reactive property that defaults to `true` can never be turned off from a
 * template; the only way to unset it is imperative property access, which
 * defeats the point of having an attribute.
 *
 * Invert the property instead: name it for the non-default state (`hidden`
 * rather than `visible`, `disabled` rather than `enabled`) and default it to
 * `false`.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;
type FieldNode = Deno.lint.PropertyDefinition | Deno.lint.AccessorProperty;

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** The value of one entry of an options object literal. */
function optionValue(
  options: Deno.lint.Expression | undefined | null,
  name: string,
): Deno.lint.Expression | null {
  if (!options || options.type !== "ObjectExpression") return null;
  for (const entry of options.properties) {
    if (entry.type !== "Property") continue;
    if (objectKeyName(entry.key) !== name) continue;
    return entry.value as Deno.lint.Expression;
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

/** Whether an options object says `attribute: false`. */
function attributeDisabled(options: Deno.lint.Expression | null): boolean {
  const value = optionValue(options, "attribute");
  return value !== null && value.type === "Literal" && value.value === false;
}

/** Whether an options object says `type: Boolean`. */
function declaresBoolean(options: Deno.lint.Expression | null): boolean {
  const value = optionValue(options, "type");
  return value !== null && value.type === "Identifier" &&
    value.name === "Boolean";
}

/**
 * The initialiser to report, when it is not provably absent-or-false.
 *
 * Only two shapes are provably safe: no initialiser at all, and literal
 * `false`. A computed default such as `DEFAULTS.open` may be `true`, and
 * nothing in the file settles it.
 */
function unsafeInitializer(member: FieldNode): Deno.lint.Expression | null {
  const value = member.value;
  if (!value) return null;
  if (value.type === "Literal" && value.value === false) return null;
  return value;
}

/** Instance fields of a class, keyed by name. */
function fieldsByName(node: ClassNode): Map<string, FieldNode> {
  const fields = new Map<string, FieldNode>();
  for (const member of classMembers(node)) {
    if (
      member.type !== "PropertyDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    if (member.static) continue;
    const name = keyName(member.key);
    if (name !== null) fields.set(name, member);
  }
  return fields;
}

/**
 * Rejects a `{type: Boolean}` property whose default is not literal `false`.
 */
export const noBooleanPropertyDefaultTrue: Deno.lint.Rule = {
  create(ctx) {
    function report(node: Deno.lint.Node, name: string): void {
      ctx.report({
        node,
        message:
          `Boolean property "${name}" has a default that is not literal false.`,
        hint:
          "A boolean attribute is true when present and false when absent, so markup cannot unset a truthy default. Default it to false, or invert the property.",
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node, ctx)) return;
      const fields = fieldsByName(node);

      for (const member of classMembers(node)) {
        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }

        const decorator = findDecorator(member.decorators ?? [], "property");
        if (decorator) {
          const options = decoratorOptions(decorator);
          if (attributeDisabled(options)) continue;
          if (!declaresBoolean(options)) continue;
          const initializer = unsafeInitializer(member);
          const name = keyName(member.key);
          if (initializer && name !== null) report(initializer, name);
          continue;
        }

        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name === null) continue;
          const options = entry.value as Deno.lint.Expression;
          if (attributeDisabled(options)) continue;
          if (!declaresBoolean(options)) continue;
          const field = fields.get(name);
          if (!field) continue;
          const initializer = unsafeInitializer(field);
          if (initializer) report(initializer, name);
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
