import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';

const TARGET_URL = 'https://img.rewe-static.de/6359221/887830_digital-image.png?impolicy=s-products&imwidth=928';
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
  
  console.log('Fetching direct image:', TARGET_URL);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = 'rewe-drink.png';
  try {
    await downloadImage(TARGET_URL, filename);
    console.log('Successfully downloaded to:', filename);
  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
})();
