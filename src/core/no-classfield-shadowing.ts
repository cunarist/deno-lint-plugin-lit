/**
 * `no-classfield-shadowing`
 *
 * A plain class field must not shadow a reactive property. With TypeScript's
 * `useDefineForClassFields` (the default under modern targets) a class field is
 * emitted as `Object.defineProperty`, which overwrites the accessor Lit
 * installed for the reactive property. The property then stops reacting.
 *
 * Two shapes are caught:
 *
 * - a field shadowing a reactive property declared on an ancestor class in the
 *   same module;
 * - a field shadowing an entry of the same class's `static properties`.
 *
 * The fix is `declare foo: string;` (type-only, emits nothing) or `accessor`.
 */

import {
  classMembers,
  isLitComponent,
  isReactiveProperty,
  keyName,
  memberPath,
} from "#helpers";
import type { ClassMember } from "#helpers";

/** Depth limit for walking a superclass chain, as a cycle guard. */
const MAX_DEPTH = 16;

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key, for `static properties` entries. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Names declared by a class's `static properties` object, if any. */
function staticPropertyNames(node: ClassNode): Set<string> {
  const names = new Set<string>();
  for (const member of classMembers(node)) {
    if (member.type !== "PropertyDefinition") continue;
    if (!member.static || keyName(member.key) !== "properties") continue;
    const value = member.value;
    if (!value || value.type !== "ObjectExpression") continue;
    for (const entry of value.properties) {
      if (entry.type !== "Property") continue;
      const name = objectKeyName(entry.key);
      if (name !== null) names.add(name);
    }
  }
  return names;
}

/** Every reactive property name a class declares, decorated or static. */
function reactivePropertyNames(node: ClassNode): Set<string> {
  const names = staticPropertyNames(node);
  for (const member of classMembers(node)) {
    if (
      member.type !== "PropertyDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    if (!isReactiveProperty(member)) continue;
    const name = keyName(member.key);
    if (name !== null) names.add(name);
  }
  return names;
}

/** The enclosing `Program`, reached through parent links. */
function programOf(node: Deno.lint.Node): Deno.lint.Program | null {
  let current: Deno.lint.Node | undefined = node;
  while (current) {
    if (current.type === "Program") return current;
    current = (current as { parent?: Deno.lint.Node }).parent;
  }
  return null;
}

/** A top-level class declaration by name, unwrapping `export class X`. */
function findClassNamed(
  program: Deno.lint.Program,
  name: string,
): Deno.lint.ClassDeclaration | null {
  for (const statement of program.body) {
    const declaration = statement.type === "ExportNamedDeclaration"
      ? statement.declaration
      : statement;
    if (!declaration || declaration.type !== "ClassDeclaration") continue;
    if (declaration.id?.name === name) return declaration;
  }
  return null;
}

/** The named superclass of a class, if it is a plain identifier. */
function superClassName(node: ClassNode): string | null {
  const superClass = node.superClass;
  if (!superClass || superClass.type !== "Identifier") return null;
  return memberPath(superClass);
}

/**
 * Ancestor classes declared in the same module, nearest first, or null when the
 * class is not a Lit component. `isLitComponent` already follows the superclass
 * chain, so this only re-walks it to collect the same-module ancestors whose
 * reactive properties a field here could shadow.
 */
function litAncestors(
  node: ClassNode,
  ctx: Deno.lint.RuleContext,
): ClassNode[] | null {
  if (!isLitComponent(node, ctx)) return null;
  const program = programOf(node);
  if (!program) return [];
  const ancestors: ClassNode[] = [];
  let current: ClassNode = node;
  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    const name = superClassName(current);
    if (name === null) break;
    const parent = findClassNamed(program, name);
    if (!parent || parent === current) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

/** Whether a member is a plain, emitted instance field. */
function isPlainInstanceField(
  member: ClassMember,
): member is Deno.lint.PropertyDefinition {
  if (member.type !== "PropertyDefinition") return false;
  if (member.static) return false;
  if (member.declare) return false;
  return !isReactiveProperty(member);
}

/**
 * Rejects a plain class field whose name matches a reactive property.
 */
export const noClassfieldShadowing: Deno.lint.Rule = {
  create(ctx) {
    function check(node: ClassNode): void {
      const ancestors = litAncestors(node, ctx);
      if (ancestors === null) return;

      const shadowed = staticPropertyNames(node);
      for (const ancestor of ancestors) {
        for (const name of reactivePropertyNames(ancestor)) shadowed.add(name);
      }
      if (shadowed.size === 0) return;

      for (const member of classMembers(node)) {
        if (!isPlainInstanceField(member)) continue;
        const name = keyName(member.key);
        if (name === null || !shadowed.has(name)) continue;
        ctx.report({
          node: member.key,
          message: `Class field "${name}" shadows a reactive property.`,
          hint:
            "Under useDefineForClassFields this overwrites Lit's accessor. Use `declare` or set the value in the constructor.",
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
