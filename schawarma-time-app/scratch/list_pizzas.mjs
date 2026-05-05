import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to pizza category page...');
    await page.goto('https://www.call-a-pizza.de/muenchen_westend/pizza', { waitUntil: 'networkidle', timeout: 60000 });
    
    const pizzas = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('img'));
      return items.map(img => {
        const src = img.src;
        const name = img.alt;
        return { src, name };
      }).filter(item => item.src.includes('products/') && (item.src.endsWith('.png') || item.src.endsWith('.webp')));
    });

    console.log(JSON.stringify(pizzas, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
