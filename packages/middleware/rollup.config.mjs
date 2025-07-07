import typescript from '@rollup/plugin-typescript';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

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
};
