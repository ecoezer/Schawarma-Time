import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';

const TARGET_URLS = [
  'https://walko-drinks.de/collections/erfrischungsgetranke'
];
const OUTPUT_DIR = 'public/assets/getraenke';

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(path.join(OUTPUT_DIR, filename));
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  for (const targetUrl of TARGET_URLS) {
    console.log('Processing:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Extract all image-related data
    const imgData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        srcset: img.srcset,
        alt: img.alt,
        dataSrc: img.getAttribute('data-src'),
        dataSrcset: img.getAttribute('data-srcset')
      }));
    });

    console.log(`Raw images found: ${imgData.length}`);
    
    for (const img of imgData) {
      let src = img.dataSrc || img.src;
      if (!src || src.includes('base64')) continue;
      if (src.startsWith('//')) src = 'https:' + src;

      // Shopify product image pattern
      if (src.includes('/products/') || src.includes('/files/')) {
        const safeName = (img.alt || path.basename(src).split('?')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 50);
        
        const filename = `${safeName}.png`;
        if (!fs.existsSync(path.join(OUTPUT_DIR, filename))) {
          try {
            console.log('Downloading:', src, '->', filename);
            await downloadImage(src, filename);
          } catch (e) {}
        }
      }
    }
  }

  await browser.close();
})();
