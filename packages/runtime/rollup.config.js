import json from '@rollup/plugin-json';
import { createFilter } from '@rollup/pluginutils';
import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescriptPaths from 'rollup-plugin-typescript-paths';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';
import copy from 'rollup-plugin-copy';

const isProduction = process.env.NODE_ENV === 'production';
const format = process.env.FORMAT || 'es';

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * built on: ${new Date().toISOString()}
 */
`;

const devCJSConfig = {
  input: './src/index.ts',
  output: {
    file: './dist/index.dev.cjs',
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true,
    banner,
  },
  plugins: [
    resolve({
      browser: false,
      preferBuiltins: true,
      mainFields: ['module', 'main'],
      extensions: ['.js', '.ts', '.json'],
    }),
    commonjs(),
    json(),
    filenameReplacePlugin(),
    typescriptPaths({
      tsconfig: './tsconfig.json',
      preserveExtensions: true,
      nonRelative: false,
    }),
    esbuild({
      sourceMap: true,
      minify: false,
      treeShaking: false,
      target: 'node18',
    }),
    sourcemaps(),
    copy({
      targets: [
        { src: 'src/data/*', dest: 'dist/data' },
        { src: 'src/static/*', dest: 'dist/static' },
        { src: 'node_modules/swagger-ui-dist/*.{js,css,html,.js.map}', dest: 'dist' },
      ],
    }),
  ],
};

const devESConfig = {
  input: './src/index.ts',
  output: {
    format: 'es',
    sourcemap: true,
    file: './dist/index.dev.js',
    banner,
  },
  plugins: [
    json(),
    filenameReplacePlugin(),
    typescriptPaths({
      tsconfig: './tsconfig.json',
      preserveExtensions: true,
      nonRelative: false,
    }),
    esbuild({
      sourceMap: true,
      minify: false,
      treeShaking: false,
      target: 'node18',
    }),
    sourcemaps(),
    copy({
      targets: [
        { src: 'src/data/*', dest: 'dist/data' },
        { src: 'src/static/*', dest: 'dist/static' },
      ],
    }),
  ],
};

const prodConfig = {
  input: './src/index.ts',
  output: {
    file: './dist/index.cjs',
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true,
    banner,
  },
  plugins: [
    resolve({
      browser: false,
      preferBuiltins: true,
      mainFields: ['module', 'main'],
      extensions: ['.js', '.ts', '.json'],
    }),
    commonjs(),
    json(),
    typescriptPaths({
      tsconfig: './tsconfig.json',
      preserveExtensions: true,
      nonRelative: false,
    }),
    filenameReplacePlugin(),
    esbuild({
      sourceMap: true,
      minify: true,
      treeShaking: true,
      target: 'node18',
    }),
    sourcemaps(),
    terser(),
    copy({
      targets: [
        { src: 'src/data/*', dest: 'dist/data' },
        { src: 'src/static/*', dest: 'dist/static' },
      ],
    }),
  ],
};

let devConfig = devESConfig;
if (format === 'cjs') {
  devConfig = devCJSConfig;
}

const config = isProduction ? prodConfig : devConfig;

export default config;

function filenameReplacePlugin() {
  const filter = createFilter('**/*.ts', 'node_modules/**');

  return {
    name: 'filename-replace',
    transform(code, id) {
      if (!filter(id)) return null;

      // Normalize the path for different environments
      const normalizedId = path.normalize(id);

      // Extract the part of the path after '/src' and remove the file extension
      const relativePath = path.relative(path.resolve('src'), normalizedId);
      const filenameWithoutExtension = relativePath.replace(path.extname(relativePath), '');

      // Replace backslashes with forward slashes if on Windows
      const unixStylePath = filenameWithoutExtension.replace(/\\/g, '/');

      const modifiedCode = code.replace(/___FILENAME___/g, unixStylePath);

      return {
        code: modifiedCode,
        map: null, // Handle source maps if necessary
      };
    },
  };
}
