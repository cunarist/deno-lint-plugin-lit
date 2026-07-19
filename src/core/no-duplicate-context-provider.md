# no-duplicate-context-provider

Rejects two `@provide` declarations for the same context object on one class.

## Why

`@provide({ context: x })` registers this element as the provider of `x`. Doing
it twice on the same element registers two providers for one key on one node.
Only one can answer a consumer's `context-request`, and which one wins is an
implementation detail of the order the decorators ran. The other field looks
live — it has a value, it is reactive, updating it re-renders — but no consumer
ever reads it.

It is almost always a copy-paste slip: a second field was duplicated from the
first and its context reference was never changed.

## Examples

```ts
class Layout extends LitElement {
  // BAD
  @provide({ context: boardContext })
  accessor board = EMPTY_BOARD_CONTEXT;

  @provide({ context: boardContext })
  accessor alsoBoard = EMPTY_BOARD_CONTEXT;
}
```

```ts
class Layout extends LitElement {
  // GOOD
  @provide({ context: boardContext })
  accessor board = EMPTY_BOARD_CONTEXT;

  @provide({ context: appDialogContext })
  accessor dialog = EMPTY_APP_DIALOG_CONTEXT;
}
```

## Notes

- Contexts are compared by the source text of the reference, so `contexts.board`
  and `boardContext` are treated as different even if they resolve to the same
  object. There is no cross-file resolution to tell them apart.
- Providing a context and also consuming it on the same class is allowed; that
  is a legitimate way to re-provide a value from an ancestor.
- The first `@provide` is left alone and every later one is reported.
