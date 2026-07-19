# no-private-properties

Rejects `@property` on a field whose name reads as private — `#count` or
`_count`.

## Why

`@property` declares part of a component's public API: an observed attribute
that any markup can set. Naming the field private and then exposing it as an
attribute contradicts itself, and the attribute is live whether you intended it
or not — outside markup can write to what the name says is internal state.
`@state` gives the same reactivity with no attribute.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  _open = false;
}

// GOOD
class El extends LitElement {
  @state()
  accessor _open = false;
}
```

## Notes

- Both private spellings are checked: a leading `#` and a leading `_`.
- `@state` on a private name is the fix, and is never flagged.
- Undecorated private fields are ignored entirely.
- Entries of a `static properties` object are checked the same way.
- The rule matches on the name only. It does not check whether the field is
  actually used privately.
