/**
 * `attribute-names`
 *
 * HTML attribute names are ASCII case-insensitive, so Lit lowercases them. A
 * property named `myProp` is observed as the attribute `myprop`, not `myProp`
 * and not `my-prop` — a mismatch that silently does nothing when someone writes
 * `<my-el my-prop="…">`. Any camelCase reactive property must therefore say what
 * its attribute is: `@property({attribute: "my-prop"})`, or `attribute: false`
 * if it should not be settable from markup at all.
 */

import {
  classMembers,
  findDecorator,
  isLitComponent,
  keyName,
  pascalToKebab,
} from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key, for options and `static properties`. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Whether an options object literal sets `attribute`. */
function declaresAttribute(node: Deno.lint.Expression | undefined): boolean {
  if (!node || node.type !== "ObjectExpression") return false;
  for (const entry of node.properties) {
    // A spread could carry `attribute`; assume it does rather than false-flag.
    if (entry.type === "SpreadElement") return true;
    if (objectKeyName(entry.key) === "attribute") return true;
  }
  return false;
}

/** The options object passed to `@property({...})`, if any. */
function decoratorOptions(
  decorator: Deno.lint.Decorator,
): Deno.lint.Expression | undefined {
  const expression = decorator.expression;
  if (expression.type !== "CallExpression") return undefined;
  const first = expression.arguments[0];
  if (!first || first.type === "SpreadElement") return undefined;
  return first;
}

/** Whether a property name maps cleanly to a lowercase attribute. */
function isLowercase(name: string): boolean {
  return name === name.toLowerCase();
}

export const attributeNames: Deno.lint.Rule = {
  create(ctx) {
    function report(node: Deno.lint.Node, name: string): void {
      ctx.report({
        node,
        message:
          `Reactive property "${name}" has no explicit attribute name, so its attribute is "${name.toLowerCase()}".`,
        hint: `Add attribute: "${
          pascalToKebab(name)
        }" — or attribute: false if it should not be set from markup.`,
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node)) return;
      for (const member of classMembers(node)) {
        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }

        const decorator = findDecorator(member.decorators ?? [], "property");
        if (decorator) {
          const name = keyName(member.key);
          if (name === null || isLowercase(name)) continue;
          if (declaresAttribute(decoratorOptions(decorator))) continue;
          report(member.key, name);
          continue;
        }

        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name === null || isLowercase(name)) continue;
          if (declaresAttribute(entry.value as Deno.lint.Expression)) continue;
          report(entry.key, name);
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
