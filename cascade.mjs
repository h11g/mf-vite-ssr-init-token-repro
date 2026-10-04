import { init as initRuntime } from '@module-federation/runtime';

// Resolve remote entries to the built SSR containers instead of fetching them.
const loadFromDist = {
  name: 'load-from-dist',
  loadEntry: ({ remoteInfo }) => import(`./dist/${remoteInfo.name}/remoteEntry.ssr.js`),
};

let remoteInitBodyRuns = 0;
initRuntime({
  name: 'remote',
  remotes: [],
  plugins: [
    {
      name: 'count-init-body',
      initContainerShareScopeMap(args) {
        remoteInitBodyRuns++;
        return args;
      },
    },
  ],
});

// `mid` also consumes `remote`, so its runtime instance lists it.
initRuntime({
  name: 'mid',
  remotes: [{ name: 'remote', entry: 'remote' }],
  plugins: [loadFromDist],
});

const host = initRuntime({
  name: 'host',
  remotes: [
    { name: 'mid', entry: 'mid' },
    { name: 'remote', entry: 'remote' },
  ],
  shareStrategy: 'version-first',
  plugins: [loadFromDist],
});

// version-first initializeSharing inits every remote of `host` with one initScope;
// `mid`'s container forwards that initScope to its own instance, which inits `remote` again.
await Promise.all(host.initializeSharing('default'));

console.log('remote init body ran:', remoteInitBodyRuns, 'time(s)');
console.log(remoteInitBodyRuns === 1 ? 'OK: re-entrant init was skipped' : 'BUG: re-entrant init ran again');
process.exitCode = remoteInitBodyRuns === 1 ? 0 : 1;
