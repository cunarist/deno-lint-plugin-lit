# prefer-context-decorators

Rejects constructing a `ContextProvider` or `ContextConsumer` by hand inside a
Lit component.

## Why

The decorators do the same job in one line and keep the declaration next to the
value it describes. A hand-built provider splits that in two: the field holds a
wrapper, and the value you actually care about is reached through `.value`,
which every reader has to remember. The decorator form is also what the rest of
this ruleset assumes — `no-context-mutation-by-consumer` and
`no-duplicate-context-provider` look for `@consume` and `@provide`, so an
imperative provider silently escapes both.

## Examples

```ts
// BAD
class El extends LitElement {
  #provider = new ContextProvider(this, { context: appContext });
}

// GOOD
class El extends LitElement {
  @provide({ context: appContext })
  accessor appState = initial;
}
```

## Notes

- Renamed imports are followed:
  `import { ContextProvider as Provider } from "@lit/context"` still fires.
- Only Lit components are checked. A plain class has no host to decorate, so
  building the provider by hand is the only option there.
- `ContextRoot` is not covered — it has no decorator equivalent.
