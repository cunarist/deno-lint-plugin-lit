/**
 * `require-property-type`
 *
 * Lit's default attribute converter is the identity: whatever the attribute
 * says arrives as a `string`. `@property() count = 0` therefore ends up holding
 * `"3"`, not `3`, the moment anyone writes `<my-el count="3">` — and
 * `open = false` becomes the truthy string `"false"`. Any reactive property
 * whose value is not a string must declare `{type: Number | Boolean | Array |
 * Object}` so Lit installs the matching converter.
 *
 * The property's shape is read from its type annotation first, then from its
 * initialiser. A property whose shape cannot be determined statically is left
 * alone.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;
type FieldNode = Deno.lint.PropertyDefinition | Deno.lint.AccessorProperty;

/** The shape a reactive property holds, as far as it can be inferred. */
type TypeKind = "string" | "number" | "boolean" | "array" | "object";

/** The Lit converter constructor that matches each inferred shape. */
const CONVERTER: Record<TypeKind, string> = {
  string: "String",
  number: "Number",
  boolean: "Boolean",
  array: "Array",
  object: "Object",
};

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
 * Whether an options object already settles how the attribute is parsed. A
 * spread counts, since it could carry any of these keys.
 */
function declaresConversion(options: Deno.lint.ObjectExpression): boolean {
  for (const entry of options.properties) {
    if (entry.type === "SpreadElement") return true;
    const name = objectKeyName(entry.key);
    if (name === "type" || name === "converter") return true;
    if (name === "attribute") {
      // `attribute: false` means the value never comes from markup.
      const value = entry.value;
      if (value.type === "Literal" && value.value === false) return true;
    }
  }
  return false;
}

/** The name of a `TSTypeReference`, if it is a plain or qualified reference. */
function typeReferenceName(node: Deno.lint.TSTypeReference): string | null {
  const name = node.typeName as unknown as {
    readonly type: string;
    readonly name?: string;
    readonly right?: { readonly name?: string };
  };
  if (name.type === "Identifier") return name.name ?? null;
  if (name.type === "TSQualifiedName") return name.right?.name ?? null;
  return null;
}

/** Inferred shape of a `: T` annotation, or null when it is not decidable. */
function kindFromAnnotation(
  annotation: Deno.lint.TSTypeAnnotation | undefined | null,
): TypeKind | null {
  const inner = annotation?.typeAnnotation;
  if (!inner) return null;
  switch (inner.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
    case "TSArrayType":
    case "TSTupleType":
      return "array";
    case "TSTypeLiteral":
      return "object";
    case "TSTypeReference": {
      const name = typeReferenceName(inner);
      if (name === "Array" || name === "ReadonlyArray") return "array";
      if (name === "Object" || name === "Record") return "object";
      if (name === "String") return "string";
      if (name === "Number") return "number";
      if (name === "Boolean") return "boolean";
      return null;
    }
    default:
      return null;
  }
}

/** Inferred shape of an initialiser, or null when it is not decidable. */
function kindFromInitializer(
  value: Deno.lint.Expression | undefined | null,
): TypeKind | null {
  if (!value) return null;
  switch (value.type) {
    case "Literal": {
      if (typeof value.value === "string") return "string";
      if (typeof value.value === "number") return "number";
      if (typeof value.value === "boolean") return "boolean";
      return null;
    }
    case "TemplateLiteral":
      return "string";
    case "ArrayExpression":
      return "array";
    case "ObjectExpression":
      return "object";
    case "UnaryExpression":
      return value.operator === "-" || value.operator === "+"
        ? kindFromInitializer(value.argument)
        : null;
    default:
      return null;
  }
}

/**
 * The `: T` annotation of a class field. `AccessorProperty` carries one at
 * runtime but omits it from Deno's typings, so it is read through a narrow
 * cast. Verified against Deno 2.9.3; drop the cast if the typings catch up.
 */
function fieldAnnotation(
  member: FieldNode,
): Deno.lint.TSTypeAnnotation | undefined {
  const bag = member as unknown as {
    typeAnnotation?: Deno.lint.TSTypeAnnotation;
  };
  return bag.typeAnnotation;
}

/** Inferred shape of a class field: annotation first, then initialiser. */
function fieldKind(member: FieldNode): TypeKind | null {
  const annotated = kindFromAnnotation(fieldAnnotation(member));
  if (annotated !== null) return annotated;
  return kindFromInitializer(member.value);
}

/**
 * Requires `{type: …}` on a `@property` whose value is not a string.
 */
export const requirePropertyType: Deno.lint.Rule = {
  create(ctx) {
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
        if (!decorator) continue;
        const options = decoratorOptions(decorator);
        if (options && declaresConversion(options)) continue;

        const kind = fieldKind(member);
        if (kind === null || kind === "string") continue;
        const name = keyName(member.key);
        if (name === null) continue;

        ctx.report({
          node: member.key,
          message:
            `Reactive property "${name}" holds a ${kind} but declares no attribute type.`,
          hint:
            `Lit's default converter yields a string. Write @property({type: ${
              CONVERTER[kind]
            }}) — or attribute: false if it is never set from markup.`,
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
