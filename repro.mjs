import { init as initRuntime } from '@module-federation/runtime';

// Pre-create the runtime instance the container will reuse (same name), with a
// plugin that counts how often init() reaches initShareScopeMap.
let initBodyRuns = 0;
initRuntime({
  name: 'remote',
  remotes: [],
  plugins: [
    {
      name: 'count-init-body',
      initContainerShareScopeMap(args) {
        initBodyRuns++;
        return args;
      },
    },
  ],
});

const container = await import('./dist/remote/remoteEntry.ssr.js');
const initScope = [];

const first = await container.init({}, initScope);
const second = await container.init({}, initScope);

console.log('first init() returned :', first === undefined ? 'undefined' : 'runtime instance');
console.log('second init() returned:', second === undefined ? 'undefined' : 'runtime instance');
console.log('init body ran         :', initBodyRuns, 'time(s)');
console.log('initScope tokens      :', initScope.length);
console.log(initBodyRuns === 1 ? 'OK: re-entrant init was skipped' : 'BUG: re-entrant init ran again');
process.exitCode = initBodyRuns === 1 ? 0 : 1;
