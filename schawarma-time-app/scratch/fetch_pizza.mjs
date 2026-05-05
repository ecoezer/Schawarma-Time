import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to page...');
    await page.goto('https://www.call-a-pizza.de/muenchen_westend/pizza-prosciutto', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait a bit more
    await page.waitForTimeout(5000);

    const html = await page.content();
    fs.writeFileSync('scratch/pizza_page.html', html);
    console.log('HTML saved to scratch/pizza_page.html');

    const content = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText;
      return { title };
    });

    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
