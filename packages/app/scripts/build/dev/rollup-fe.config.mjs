import path from 'path';
import { fileURLToPath } from 'url';
// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import del from 'rollup-plugin-delete';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import vanillaConfig from './rollup-vanilla.config.mjs';

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

// Get the directory name of the current module
const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    input: 'src/react/index.tsx', // Your React entry file

    output: {
      dir: './dist/assets',
      format: 'esm',
      sourcemap: true,

      entryFileNames: 'app.bundle.dev.js', // Custom name for the entry chunk
      chunkFileNames: '[name]-[hash].dev.js', // Naming pattern for dynamically imported chunks
      // globals: {
      //   react: 'React',
      //   'react-dom': 'ReactDOM',
      // },
    },
    plugins: [
      del({ targets: './dist/assets/*.dev.js*' }),

      resolve({
        browser: true,
      }),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('development'), // or 'production'
      }),

      typescriptPaths({
        tsconfig: '../../../tsconfig.json', // Ensure this points to your tsconfig file
        preserveExtensions: true,
        nonRelative: false,
      }),

      esbuild({
        // Ensuring the JSX is transformed
        // jsxFactory: 'React.createElement',
        // jsxFragment: 'React.Fragment',
        minify: true,
        treeShaking: false,
        keepNames: true, // Enable the keepNames option
        jsx: 'automatic',
      }),

      commonjs(),
      json({
        compact: true,
      }),

      postcss({
        plugins: [],
      }),

      // visualizer({
      //     filename: 'analysis/dev/react-bundle-anaylze.html',
      // }),
    ],
    onwarn,
    //external: ['react', 'react-dom'], // tell Rollup they're external
  },

  ...vanillaConfig,
];
