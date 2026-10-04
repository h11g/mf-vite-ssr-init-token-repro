# SSR remote entry: `init()` re-entrancy guard never matches

Minimal reproduction for `@module-federation/vite` 1.23.1 (unchanged on `main`).

The generated SSR remote entry (`remoteEntry.ssr.js`) creates its init token inside `init()`:

```js
async function init(shared = {}, initScope = []) {
  const initRes = runtimeInit({ name: "remote", remotes: [], shared: {} });
  const initToken = { from: "remote" };          // new object on every call
  if (initScope.indexOf(initToken) >= 0) return; // can never match
  initScope.push(initToken);
  // ... initShareScopeMap / initializeSharing / loadShare ...
}
```

Since the token is a new object on every call, `indexOf` never finds it, so a second `init()` with the same `initScope` array runs the whole body again. The browser remote entry keeps its token at module level (`initTokens[shareScopeName]`), so there the same call returns early.

## Versions

- Node 24.4.1
- vite 8.3.2
- @module-federation/vite 1.23.1
- @module-federation/runtime 2.9.2

## Steps

```sh
npm ci
npm run repro    # calls init() twice with the same initScope array
npm run cascade  # the same thing, driven by runtime-core's version-first initializeSharing
```

`build.mjs` builds two SSR containers (`remote` and `mid`) from `src/widget.js` with Vite's `build()` API in SSR mode (`build.ssr`). A runtime plugin counts how many times `remote`'s `init()` body reaches `initShareScopeMap`.

- `repro.mjs` imports `dist/remote/remoteEntry.ssr.js` and calls `init({}, initScope)` twice with the same array.
- `cascade.mjs` sets up a `host` runtime with `shareStrategy: 'version-first'` and remotes `mid` and `remote`. The `mid` runtime instance also lists `remote`. `host.initializeSharing('default')` passes its `initScope` to both containers' `init()`, and `mid`'s container passes it on to `remote` again, so `remote.init()` gets the same array twice. The script pre-creates `mid`'s runtime instance with `remote` registered, standing in for the consumer-side init a real `mid` would run itself.

## Expected

The second `init()` that receives the same `initScope` returns early, so the body runs once (this is what the browser remote entry does):

```
second init() returned: undefined
init body ran         : 1 time(s)
initScope tokens      : 1
OK: re-entrant init was skipped
```

## Actual

```
first init() returned : runtime instance
second init() returned: runtime instance
init body ran         : 2 time(s)
initScope tokens      : 2
BUG: re-entrant init ran again
```

```
remote init body ran: 2 time(s)
BUG: re-entrant init ran again
```

Both scripts exit with code 1 when the bug is present and 0 when it is fixed.
