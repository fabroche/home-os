// Junta los documentos compartibles en UN solo PDF para imprimir.
// Excluye a propósito 04-guion-tarde (es privado, solo para el anfitrión).
// Uso:  node presentacion/build-todo.mjs
import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));

// Orden de la presentación (sin el guion privado):
const order = [
  '00-portada.html',
  '01-dossier-homeos.html',
  '02-vision-idea.html',
  '05-diagramas.html',
  '06-numeros.html',
  '03-roles-cocreacion.html',
];

const bodies = order.map((f) => {
  const html = readFileSync(join(here, f), 'utf8');
  return html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
});

const combined = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Núcleo · Presentación completa</title>
<link rel="stylesheet" href="assets/styles.css"></head>
<body>${bodies.join('\n')}</body></html>`;

const tmp = join(here, '_combined.html');
writeFileSync(tmp, combined);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });

const out = join(here, 'Nucleo-presentacion-completa.pdf');
const opts = { format: 'A4', printBackground: true, preferCSSPageSize: true };
try {
  await page.pdf({ path: out, ...opts });
  console.log('✓ Nucleo-presentacion-completa.pdf');
} catch (e) {
  if (e.code === 'EBUSY') {
    await page.pdf({ path: join(here, 'Nucleo-presentacion-completa.NUEVO.pdf'), ...opts });
    console.log('⚠ estaba abierto → escrito como Nucleo-presentacion-completa.NUEVO.pdf');
  } else { throw e; }
}

await browser.close();
unlinkSync(tmp);
