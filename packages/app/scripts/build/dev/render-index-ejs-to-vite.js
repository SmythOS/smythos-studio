import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ejs from 'ejs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths
const templatePath = resolve(__dirname, '../../../views/index.ejs');
const outputPath = resolve(__dirname, '../../../src/react/index.html');

// Dummy data you can use in the EJS template
const data = {
  env: 'DEV',
  page: 'dev-vite-react.ejs',
};

try {
  const template = await readFile(templatePath, 'utf-8');
  const rendered = ejs.render(template, data, {
    filename: templatePath,
  });
  // remove the "<script type="module" src="/js/build/react/app.bundle.dev.js"></script>" from the rendered html
  // const renderedWithoutScript = rendered.replace(
  //   '<script type="module" src="/js/build/react/app.bundle.dev.js"></script>',
  //   '',
  // );
  await writeFile(outputPath, rendered);
  console.log(`✅ EJS rendered to ${outputPath}`);
} catch (err) {
  console.error('[EJS RENDER ERROR]', err);
  process.exit(1);
}
