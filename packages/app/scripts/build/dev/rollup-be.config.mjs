// rollup.config.js
import typescript from 'rollup-plugin-typescript2';
import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import pkg from '../../../package.json' with { type: 'json' };
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import copy from 'rollup-plugin-copy';

const args = process.argv.slice(2);
const isDebugMode = args.includes('--debug');

//custom wartnings handler
const onwarn = function (warning, warn) {
  if (!isDebugMode) {
    return;
  }
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
      dir: './dist/server',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      typescriptPaths({
        tsconfig: '../../../tsconfig.json', // Ensure this points to your tsconfig file
        preserveExtensions: true,
        nonRelative: false,
      }),
      esbuild(),
      nodeResolve(),
      commonjs(),

      json(),
      sourcemaps(),

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
