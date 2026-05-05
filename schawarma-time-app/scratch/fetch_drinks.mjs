import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';

const TARGET_URL = 'https://walko-drinks.de/products/coca-cola-24-x-0-33-dose';
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
  console.log('Navigating to:', TARGET_URL);
  
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.error('Initial navigation failed, trying again with different wait...', e.message);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  }

  // Scroll to trigger lazy loading
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      className: img.className
    }));
  });

  console.log(`Found ${images.length} images total.`);

  const productImages = images.filter(img => {
    const src = img.src.toLowerCase();
    // Look for product-like images
    return (src.includes('cdn.shopify.com') || src.includes('products')) 
           && !src.includes('badge') 
           && !src.includes('icon');
  });

  const uniqueUrls = [...new Set(productImages.map(img => img.src))];
  console.log('Filtered Product Images:', uniqueUrls);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (let i = 0; i < uniqueUrls.length; i++) {
    let url = uniqueUrls[i];
    // Shopify URLs often omit "https:"
    if (url.startsWith('//')) url = 'https:' + url;

    const ext = '.png'; // Force png as requested, or detect
    const filename = `drink-${i}${ext}`;
    try {
      console.log('Downloading:', url);
      await downloadImage(url, filename);
    } catch (err) {
      console.error('Error downloading:', url, err.message);
    }
  }

  await browser.close();
})();
