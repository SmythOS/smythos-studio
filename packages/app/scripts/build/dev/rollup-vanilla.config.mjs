import path from 'path';
import { fileURLToPath } from 'url';
// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import packageJson from '../../../package.json' with { type: 'json' };

// Check if debug flag is passed in CLI arguments
const args = process.argv.slice(2);
// const isDebugMode = args.includes('--debug');
const isDebugMode = true;

// Custom warnings handler that only shows warnings in debug mode
function onwarn(warning, warn) {
  // If not in debug mode, suppress all warnings
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
}

// Get the directory name of the current module
const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    input: './src/builder-ui/index.ts',
    output: {
      entryFileNames: 'index.dev.js',
      dir: path.resolve(currentDir, '../../../static/js/build'),
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify('development'), // or 'production'
          __APP_VERSION__: `${packageJson.version}`,
          __APP_ENV__: 'DEV',
          __DEBUG_MODE__: JSON.stringify(isDebugMode),
        },
      }),

      typescriptPaths({
        tsconfig: '../../../tsconfig.json', // Add this to resolve @src and other path aliases
        preserveExtensions: true,
        nonRelative: false,
      }),

      esbuild({
        // minify: true,
        // treeShaking: false,
        // keepNames: true, // Enable the keepNames option
        jsx: 'automatic',
      }),

      nodeResolve({
        browser: true,
      }),
      commonjs(),
      json({
        compact: true,
      }),
      sourcemaps(),
      copy({
        targets: [
          {
            src: path.resolve(currentDir, '../../../src/builder-ui/data/*'),
            dest: path.resolve(currentDir, '../../../static/data'),
          },
        ],
      }),
      postcss({
        plugins: [],
      }),

      // visualizer({
      //     filename: 'analysis/dev/vanilla-bundle-analyze.html',
      // }),
    ],
    onwarn,
  },
];
