# no-context-mutation-by-consumer

Rejects assignment to a field declared with `@consume`.

## Why

A `@consume` field is a view of a value that the provider owns. Writing to it
changes the consumer's local copy and nothing else: the provider does not see
the change, no sibling consumer sees it, and the next time the provider
publishes, the write is silently overwritten. Under
`@consume({ subscribe: true })` that can happen on the very next update, so the
assignment appears to work and then undoes itself.

Change the value where it lives. The usual shape is to put a callback on the
context object itself, so consumers ask the provider to change the value instead
of writing it.

## Examples

```ts
class Panel extends LitElement {
  @consume({ context: appSettingsContext, subscribe: true })
  accessor #settings = EMPTY_APP_SETTINGS_CONTEXT;

  // BAD
  #hide() {
    this.#settings = { ...this.#settings, showSidebar: false };
  }

  // GOOD
  #hideProperly() {
    this.#settings.updateSettings({ showSidebar: false });
  }
}
```

## Notes

- Compound assignment (`+=`) and update expressions (`++`) count as writes.
- Both `@property`-style fields and `accessor` fields are checked, and private
  `#name` fields are matched by name like any other.
- Mutating _through_ the field (`this.#settings.showSidebar = false`) is not
  flagged. It is also wrong, but a rule cannot tell an owned nested object from
  a borrowed one without types.
