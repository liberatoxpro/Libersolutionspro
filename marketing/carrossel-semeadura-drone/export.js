// Exporta cada slide do carrossel como PNG 1080x1350.
// Uso: node marketing/carrossel-semeadura-drone/export.js
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const dir = __dirname;
  const out = path.join(dir, 'png');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(dir, 'index.html') + '?export=1', { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    const file = path.join(out, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await slides[i].screenshot({ path: file });
    console.log('ok', path.relative(process.cwd(), file));
  }
  await browser.close();
})();
