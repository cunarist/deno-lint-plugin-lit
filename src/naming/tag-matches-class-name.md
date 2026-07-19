# tag-matches-class-name

Rejects a `@customElement` tag whose segments, after any leading prefix, do not
PascalCase to the class name.

## Why

The tag is what you search for in a template; the class is what you search for
in code. When they disagree, finding the component that renders a given element
becomes guesswork, and a copy-pasted decorator that still carries the old tag
registers the wrong name with no error at all. Requiring the tag to name the
class makes the two searchable from each other.

## Examples

```ts
// BAD
@customElement("cl-path-bar")
export class Sidebar extends LitElement {}

// GOOD
@customElement("cl-path-bar")
export class PathBar extends LitElement {}
```

## Notes

- A trailing `Element` on the class is stripped before comparing, so
  `cl-path-bar` accepts both `PathBar` and `PathBarElement`. That keeps this
  rule and `require-element-suffix` from contradicting each other.
- The prefix is not known — a lint rule takes no options — so any leading
  segments are accepted. The rule asks whether _some_ suffix of the tag names
  the class, which means `cl-path-bar` also accepts `Bar`. It catches a tag
  naming a different class, not every loose correspondence.
- Any number of leading prefix segments is accepted, because there is no
  configuration to name yours: `cl-path-bar` matches `PathBar` and
  `cl-md-slash-menu` matches `SlashMenu`. A tag with no prefix at all,
  `path-bar`, also matches.
- It is a suffix match, so it catches the failure that matters — a tag naming a
  different class — while ignoring which prefix you chose. `cl-path` for
  `PathBar` and `cl-path-bar-extra` for `PathBar` are both rejected.
- This replaced a configurable `element-tag-prefix` rule. Deno lint rules take
  no options, so a rule that requires a specific prefix cannot be written; the
  prefix is left unchecked and the class-name link is enforced instead. If you
  need a fixed prefix enforced, that check has to live outside this plugin.
- Only `@customElement`-registered Lit components with a class name are checked.
