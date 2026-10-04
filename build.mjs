import { build } from 'vite';
import { federation } from '@module-federation/vite';

// Two SSR containers built from the same widget: `remote`, and `mid` (used by cascade.mjs).
for (const name of ['remote', 'mid']) {
  await build({
    configFile: false,
    logLevel: 'warn',
    build: { ssr: 'src/widget.js', outDir: `dist/${name}` },
    plugins: [
      federation({
        name,
        filename: 'remoteEntry.js',
        exposes: { './widget': './src/widget.js' },
        dts: false,
      }),
    ],
  });
}
