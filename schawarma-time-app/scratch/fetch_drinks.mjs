import fs from 'fs';
import path from 'path';
import https from 'https';

const TARGET_URL = 'https://img.rewe-static.de/0038630/2109280_digital-image.png?impolicy=s-products&imwidth=928';
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
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = 'rewe-cola-1-5l.png'; // Guessing based on the image likely being a standard cola
  try {
    await downloadImage(TARGET_URL, filename);
    console.log('Successfully downloaded:', filename);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
