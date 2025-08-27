// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve, { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import packageJson from '../../../package.json' with { type: 'json' };

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
    input: 'src/react/index.tsx', // Your React entry file

    output: {
      dir: './dist/assets',
      format: 'esm',
      entryFileNames: 'app.bundle.min.js', // Custom name for the entry chunk
      chunkFileNames: '[name]-[hash].min.js', // Naming pattern for dynamically imported chunks
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
      },
    },
    plugins: [
      del({ targets: './dist/assets/*.min.js*' }),
      resolve({
        browser: true,
      }),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'), // or 'production'
      }),
      typescriptPaths({
        tsconfig: '../../../tsconfig.json',
        preserveExtensions: true,
        nonRelative: false,
      }),
      esbuild({
        // Ensuring the JSX is transformed
        // jsxFactory: 'React.createElement',
        // jsxFragment: 'React.Fragment',
        minify: true,
        treeShaking: true,
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
      //     filename: 'analysis/prod/react-bundle-anaylze.html',
      //     gzipSize: true,
      // }),
      //gzipCompress(),
    ],
    onwarn,
    //external: ['react', 'react-dom'], // tell Rollup they're external
  },

  {
    input: './src/builder-ui/index.ts',
    output: {
      entryFileNames: 'index.min.js',
      dir: './dist/assets',
      format: 'iife',
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify('production'), // or 'production'
          __APP_VERSION__: `${packageJson.version}`,
          __APP_ENV__: 'PROD',
        },
      }),
      typescriptPaths({
        tsconfig: '../../../tsconfig.json',
        preserveExtensions: true,
        nonRelative: false,
      }),
      esbuild({
        minify: true,
        treeShaking: false,
        keepNames: true, // Enable the keepNames option
        jsx: 'automatic',
      }),
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      json({
        compact: true,
      }),
      postcss({
        plugins: [],
      }),
      // visualizer({
      //     filename: 'analysis/prod/vanilla-bundle-anaylze.html',
      // }),
    ],
    onwarn,
  },
];
