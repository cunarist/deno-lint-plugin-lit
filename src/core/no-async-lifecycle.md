# no-async-lifecycle

Rejects `async` on a Lit lifecycle hook.

## Why

Lit calls its lifecycle hooks synchronously and ignores the returned Promise. An
`async` hook runs up to its first `await` and then yields, so everything after
that resumes in a later microtask — after the update it was meant to affect has
already been committed. A value assigned there lands one render too late, and in
`shouldUpdate` the Promise is always truthy, so the check is silently bypassed.
Do the asynchronous work in a reactive controller and write the result to a
reactive property.

## Examples

```ts
// BAD
class El extends LitElement {
  async willUpdate() {
    this.items = await this.load();
  }
}

// GOOD
class El extends LitElement {
  willUpdate() {
    this.items = this.loader.items;
  }
}
```

## Notes

- Checked hooks: `willUpdate`, `update`, `shouldUpdate`, `firstUpdated`,
  `updated`, `connectedCallback`, `disconnectedCallback`.
- `performUpdate` is deliberately excluded. Lit awaits it and documents an async
  override as the supported way to defer an update.
- `render` is covered by `no-async-render` instead.
- Ordinary (non-lifecycle) methods may be `async`.
