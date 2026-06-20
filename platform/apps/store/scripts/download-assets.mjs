// Downloads all Farmatotal homepage assets into public/. Run: node scripts/download-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = join(process.cwd(), 'public');

// [url, localPath under public/]
const ASSETS = [
  // brand
  ['https://www.farmatotal.com.py/wp-content/uploads/logo-farmatotal-01.svg', 'brand/logo-farmatotal.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/isotipo-farmatotal-02.svg', 'brand/isotipo.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/LOGO_CENTURY11.webp', 'brand/century.webp'],
  // hero slides
  ['https://pub-4fcba8ad35c7432395c2f98b1913d06b.r2.dev/2026/01/PEDIDOS-YA-2026-02.png', 'slider/pedidos-ya.png'],
  ['https://pub-4fcba8ad35c7432395c2f98b1913d06b.r2.dev/2025/09/BANNER-FPJ-2025-OK-01-scaled.png', 'slider/banner-fpj.png'],
  ['https://pub-4fcba8ad35c7432395c2f98b1913d06b.r2.dev/2025/09/BANNER-FAMILIAR-2025-OK-01-scaled.png', 'slider/banner-familiar.png'],
  ['https://www.farmatotal.com.py/wp-content/uploads/BANNER-TODOS-LOS-DIAS-01.png', 'slider/banner-todos-los-dias.png'],
  // category circle icons
  ['https://www.farmatotal.com.py/wp-content/uploads/COSMETICA-Y-BELLEZA.svg', 'categories/belleza.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/FRAGANCIAS.svg', 'categories/fragancias.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/HIGIENE-PERSONAL.svg', 'categories/higiene-personal.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/BEBES-Y-MAMAS.svg', 'categories/mamas-y-bebes.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/MEDICAMENTOS.svg', 'categories/medicamentos.svg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/SUPLEMENTOS-Y-DEPORTE.svg', 'categories/nutricion-y-deporte.svg'],
  // promo banners
  ['https://www.farmatotal.com.py/wp-content/uploads/BANNER-OFERTAS-TODOS-LOS-DIAS-01-1536x198.png', 'banners/todos-los-dias-70.png'],
  ['https://www.farmatotal.com.py/wp-content/uploads/BANNER-OFERTAS-SUPER-ROMBO-01-1536x198.png', 'banners/super-rombo-50.png'],
  // sample product images
  ['https://www.farmatotal.com.py/wp-content/uploads/7796285290207.jpg', 'products/hepatalgina.jpg'],
  ['https://www.farmatotal.com.py/wp-content/uploads/7796285289324.jpg', 'products/evagina.jpg'],
  ['https://pub-4fcba8ad35c7432395c2f98b1913d06b.r2.dev/2026/04/6973048313101.png', 'products/organizador-tren.png'],
  ['https://pub-4fcba8ad35c7432395c2f98b1913d06b.r2.dev/2026/04/6973048317826.png', 'products/botiquin.png'],
  ['https://www.farmatotal.com.py/wp-content/uploads/no_img.webp', 'products/no-img.webp'],
];

async function fetchOne([url, rel]) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = join(ROOT, rel);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buf);
    console.log(`  ok  ${rel}  (${(buf.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e) {
    console.error(`  FAIL ${rel}  <- ${url}  :: ${e.message}`);
    return false;
  }
}

async function main() {
  let ok = 0;
  for (let i = 0; i < ASSETS.length; i += 4) {
    const batch = ASSETS.slice(i, i + 4);
    const res = await Promise.all(batch.map(fetchOne));
    ok += res.filter(Boolean).length;
  }
  console.log(`\nDone: ${ok}/${ASSETS.length} assets downloaded.`);
}
main();
