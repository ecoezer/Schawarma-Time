import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';

const SEARCH_URL = 'https://shop.rewe.de/pd/coca-cola-1-5l/8157774'; // Specific product page
const CATEGORY_URL = 'https://shop.rewe.de/c/alkoholfreie-getraenke-cola-limonade-eistee/'; // Soft drinks category

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
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  console.log('Navigating to Rewe Soft Drinks...');
  
  try {
    await page.goto(CATEGORY_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);

    const imgData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || 'rewe-softdrink'
      }));
    });

    let count = 0;
    for (const img of imgData) {
      if (img.src.includes('rewe-static.de') && img.src.includes('digital-image')) {
        const safeName = img.alt.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 40) || `rewe-soft-${count}`;
        const filename = `${safeName}.png`;
        
        if (fs.existsSync(path.join(OUTPUT_DIR, filename))) continue;

        try {
          console.log('Downloading:', img.src, '->', filename);
          await downloadImage(img.src, filename);
          count++;
        } catch (e) {}
        if (count >= 15) break;
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
})();
