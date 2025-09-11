import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import pkg from './package.json' with { type: 'json' };

export default {
  input: 'src/index.ts',

  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    esbuild({ sourceMap: true }),
    json(),
    sourcemaps(),
    copy({
      targets: [{ src: ['src/views/*'], dest: 'dist/views' }],
    }),
  ],
  external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)],

  onwarn(warning, warn) {
    // Ignore circular deps
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    // Ignore unresolved externals
    if (warning.code === "UNRESOLVED_IMPORT") return;

    // Default handler
    warn(warning);
  }
};
