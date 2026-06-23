// Genera PDFs A4 de alta fidelidad desde los HTML del dossier usando Chromium (Playwright).
// Uso:  node presentacion/generate.mjs
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.html')).sort();

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of files) {
  const url = pathToFileURL(join(here, file)).href;
  await page.goto(url, { waitUntil: 'networkidle' });
  // Asegura que las webfonts (Google Fonts) terminaron de cargar antes de imprimir.
  await page.evaluate(async () => { await document.fonts.ready; });
  const out = join(here, file.replace(/\.html$/, '.pdf'));
  const opts = { format: 'A4', printBackground: true, preferCSSPageSize: true };
  try {
    await page.pdf({ path: out, ...opts });
    console.log('✓', file.replace(/\.html$/, '.pdf'));
  } catch (e) {
    if (e.code === 'EBUSY') {
      const alt = join(here, file.replace(/\.html$/, '.NUEVO.pdf'));
      await page.pdf({ path: alt, ...opts });
      console.log('⚠', file.replace(/\.html$/, '.pdf'), 'estaba abierto → escrito como', file.replace(/\.html$/, '.NUEVO.pdf'));
    } else { throw e; }
  }
}

await browser.close();
console.log('\nListo. PDFs generados en presentacion/');
