// rollup.config.js
import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import copy from 'rollup-plugin-copy';
import pkg from '../../../package.json' with { type: 'json' };

//custom wartnings handler
const onwarn = function (warning, warn) {
  // Check if the warning originates from node_modules
  if (warning.loc && warning.loc.file && warning.loc.file.includes('node_modules')) {
    // Ignore warnings from node_modules
    return;
  }
  // Otherwise, print the warning as usual
  warn(warning);
};
export default [
  {
    input: './src/backend/index.ts',
    output: {
      dir: './server',
      format: 'esm',
    },
    plugins: [
      typescriptPaths({
        tsconfig: '../../../tsconfig.json',
        preserveExtensions: true,
        nonRelative: false,
      }),
      esbuild({
        treeShaking: true,
      }),
      nodeResolve(),
      commonjs(),

      json({
        compact: true,
      }),

      // copy static files to dist/static
      copy({
        targets: [
          {
            src: 'static/',
            dest: 'dist/',
          },
        ],
      }),
    ],
    external: Object.keys(pkg.dependencies),
    onwarn,
  },
];
