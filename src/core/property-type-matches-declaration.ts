/**
 * `property-type-matches-declaration`
 *
 * The `type` option picks the converter Lit runs on the attribute string. If it
 * disagrees with the field's TypeScript type, the declared type is a lie:
 * `@property({type: Number}) label: string` hands `label` a `number` the moment
 * the attribute is set, and every consumer that trusted the annotation is
 * wrong. TypeScript cannot catch this — the converter runs at runtime and the
 * decorator's options object is untyped with respect to the field.
 *
 * `Object` and `Array` are treated as interchangeable: both of Lit's converters
 * are `JSON.parse`, so neither corrupts the other's data.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;
type FieldNode = Deno.lint.PropertyDefinition | Deno.lint.AccessorProperty;

/** The shape a reactive property holds, as far as it can be inferred. */
type TypeKind = "string" | "number" | "boolean" | "array" | "object";

/** `type: X` constructors Lit understands, mapped to the shape they produce. */
const CONVERTER_KIND: Record<string, TypeKind> = {
  String: "string",
  Number: "number",
  Boolean: "boolean",
  Array: "array",
  Object: "object",
};

/** Kinds that share a converter and so never conflict with one another. */
function group(kind: TypeKind): string {
  return kind === "array" || kind === "object" ? "structured" : kind;
}

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

/** The declared converter of a `type:` option, if it names a known one. */
function declaredKind(options: Deno.lint.Expression | null): {
  kind: TypeKind;
  name: string;
  node: Deno.lint.Expression;
} | null {
  const value = optionValue(options, "type");
  if (!value || value.type !== "Identifier") return null;
  const kind = CONVERTER_KIND[value.name];
  if (kind === undefined) return null;
  return { kind, name: value.name, node: value };
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

export const propertyTypeMatchesDeclaration: Deno.lint.Rule = {
  create(ctx) {
    function report(
      node: Deno.lint.Node,
      name: string,
      declared: string,
      actual: TypeKind,
    ): void {
      ctx.report({
        node,
        message:
          `Property "${name}" declares {type: ${declared}} but is typed as ${actual}.`,
        hint:
          `Lit's ${declared} converter runs at runtime and will overwrite it with a ${declared.toLowerCase()}. Fix the annotation or the type option.`,
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node)) return;
      const fields = fieldsByName(node);

      for (const member of classMembers(node)) {
        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }

        // Decorator form: options and field are the same member.
        const decorator = findDecorator(member.decorators ?? [], "property");
        if (decorator) {
          const declared = declaredKind(decoratorOptions(decorator));
          const actual = fieldKind(member);
          const name = keyName(member.key);
          if (!declared || actual === null || name === null) continue;
          if (group(declared.kind) === group(actual)) continue;
          report(declared.node, name, declared.name, actual);
          continue;
        }

        // Static form: the shape comes from a sibling field of the same name.
        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name === null) continue;
          const declared = declaredKind(entry.value as Deno.lint.Expression);
          if (!declared) continue;
          const field = fields.get(name);
          if (!field) continue;
          const actual = fieldKind(field);
          if (actual === null) continue;
          if (group(declared.kind) === group(actual)) continue;
          report(declared.node, name, declared.name, actual);
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
