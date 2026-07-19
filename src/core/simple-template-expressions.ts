/**
 * `simple-template-expressions`
 *
 * The template-purity principle: every `${…}` binding in an `html` template
 * must be an identifier, `this`, or a non-computed member chain of any depth.
 * Everything else — calls (including directive calls), arrow functions,
 * `.bind(this)`, `.map(…)`, conditionals, logical operators, literals, `await`
 * — is computed before the `return` and interpolated by name.
 *
 * The same restriction applies to the returned expression of `render()`: it may
 * not be a conditional. An early `return html`…`` inside an `if` is fine.
 */

import {
  isHtmlTemplate,
  isSimpleReference,
  keyName,
  memberPath,
} from "#helpers";

/** Any node reachable while walking up `parent` links. */
type WithParent = { readonly parent?: unknown };

/** Function-like nodes that break the "directly inside `render()`" chain. */
type FunctionNode =
  | Deno.lint.ArrowFunctionExpression
  | Deno.lint.FunctionExpression
  | Deno.lint.FunctionDeclaration;

/**
 * Names that are Lit directives. They get no exemption — the message just
 * names them accurately so the hint can say so.
 */
const DIRECTIVE_NAMES: readonly string[] = [
  "asyncAppend",
  "asyncReplace",
  "cache",
  "choose",
  "classMap",
  "guard",
  "ifDefined",
  "join",
  "keyed",
  "live",
  "map",
  "range",
  "ref",
  "repeat",
  "styleMap",
  "templateContent",
  "unsafeHTML",
  "unsafeMathML",
  "unsafeSVG",
  "until",
  "when",
];

const HOIST_HINT =
  "Compute it before the `return` and interpolate the local by name.";

interface Shape {
  readonly message: string;
  readonly hint: string;
}

/** The trailing segment of a callee path, e.g. `bind` for `this.go.bind`. */
function calleeTail(node: Deno.lint.CallExpression): string | null {
  const callee = node.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return null;
  return memberPath(callee.property);
}

function callShape(node: Deno.lint.CallExpression): Shape {
  const tail = calleeTail(node);
  if (tail === "bind") {
    return {
      message: "`.bind(this)` in template.",
      hint:
        "Use a private method field (`readonly #onClick = () => {…}`) and bind it by name.",
    };
  }
  if (tail === "map") {
    return {
      message: "`.map(…)` call in template.",
      hint:
        "Build the list with `repeat(…)` hoisted into a local, then interpolate the local.",
    };
  }
  const name = memberPath(node.callee);
  if (name !== null && DIRECTIVE_NAMES.includes(name)) {
    return {
      message: `Directive call \`${name}(…)\` in template.`,
      hint:
        `Directives are hoisted out too: assign \`${name}(…)\` to a local before the \`return\`.`,
    };
  }
  return {
    message: "Call expression in template.",
    hint: HOIST_HINT,
  };
}

function classify(node: Deno.lint.Expression): Shape {
  switch (node.type) {
    case "ArrowFunctionExpression":
      return {
        message: "Inline arrow function in template.",
        hint:
          "Extract it to a private method field (`readonly #onClick = () => {…}`) and bind it by name.",
      };
    case "FunctionExpression":
      return {
        message: "Inline function expression in template.",
        hint:
          "Extract it to a private method field (`readonly #onClick = () => {…}`) and bind it by name.",
      };
    case "CallExpression":
      return callShape(node);
    case "TaggedTemplateExpression":
      return {
        message: "Nested tagged template in template.",
        hint: HOIST_HINT,
      };
    case "ConditionalExpression":
      return {
        message: "Conditional expression in template.",
        hint: "Precompute the branch into a local before the `return`.",
      };
    case "LogicalExpression":
      return {
        message: `Logical \`${node.operator}\` expression in template.`,
        hint: "Precompute the value into a local before the `return`.",
      };
    case "TemplateLiteral":
      return {
        message: "Template literal in template.",
        hint: HOIST_HINT,
      };
    case "ObjectExpression":
      return {
        message: "Object literal in template.",
        hint: HOIST_HINT,
      };
    case "ArrayExpression":
      return {
        message: "Array literal in template.",
        hint: HOIST_HINT,
      };
    case "AwaitExpression":
      return {
        message: "`await` expression in template.",
        hint: HOIST_HINT,
      };
    case "MemberExpression":
      return {
        message: "Computed member access in template.",
        hint: "Hoist the indexed value into a local before the `return`.",
      };
    case "BinaryExpression":
      return {
        message: `Binary \`${node.operator}\` expression in template.`,
        hint: HOIST_HINT,
      };
    case "NewExpression":
      return {
        message: "`new` expression in template.",
        hint: HOIST_HINT,
      };
    default:
      return {
        message: "Complex expression in template.",
        hint: HOIST_HINT,
      };
  }
}

/** Nearest enclosing function-like node, or null. */
function enclosingFunction(node: Deno.lint.Node): FunctionNode | null {
  let current: Deno.lint.Node | undefined = node;
  while (current) {
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression" ||
      current.type === "FunctionDeclaration"
    ) {
      return current;
    }
    current = (current as WithParent).parent as Deno.lint.Node | undefined;
  }
  return null;
}

/** Whether a return statement belongs directly to a `render()` method. */
function isRenderReturn(node: Deno.lint.ReturnStatement): boolean {
  const fn = enclosingFunction(node);
  if (!fn) return false;
  const parent = (fn as WithParent).parent as Deno.lint.Node | undefined;
  if (!parent || parent.type !== "MethodDefinition") return false;
  return keyName(parent.key) === "render";
}

export const simpleTemplateExpressions: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node)) return;
        for (const expression of node.quasi.expressions) {
          if (isSimpleReference(expression)) continue;
          const shape = classify(expression);
          ctx.report({
            node: expression,
            message: shape.message,
            hint: shape.hint,
          });
        }
      },
      ReturnStatement(node) {
        const argument = node.argument;
        if (!argument || argument.type !== "ConditionalExpression") return;
        if (!isRenderReturn(node)) return;
        ctx.report({
          node: argument,
          message: "Conditional expression returned from `render()`.",
          hint:
            "Return early with `return html`…`` inside an `if`, or precompute the template into a local.",
        });
      },
    };
  },
};
