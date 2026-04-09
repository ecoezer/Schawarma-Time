const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: false }); // Show browser so user can see what's happening or solve captcha if needed
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log("Navigating to Smash47...");
  // IMPORTANT: We need the exact URL. I will ask the user for it, but for now I will prompt them if they haven't provided it.
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide the UberEats URL as an argument, e.g., node scrape.js https://...");
    await browser.close();
    process.exit(1);
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log("Page loaded. Looking for Menü 1...");

    // Wait a bit just to be human-like
    await page.waitForTimeout(3000);

    // Try to find the "Menü 1" text and click its container. UberEats dynamically changes classes, so text is safer.
    const menuItems = page.locator('text="Menü 1"');
    
    // We want the one that is likely a product card, usually an <li> or a specific <div> container. 
    // Let's just click the text directly if it is visible.
    if (await menuItems.count() > 0) {
        console.log("Found Menü 1. Clicking...");
        await menuItems.first().click();
        
        console.log("Waiting for modal to appear...");
        // Wait for the modal dialog to appear (usually role="dialog" or a specific backdrop)
        // UberEats modals usually have a close button (svg aria-label="Close" or similar) or role="dialog"
        await page.waitForSelector('div[role="dialog"]', { timeout: 15000 });
        console.log("Modal appeared!");

        // Wait a bit for images and extra data inside the modal to finish rendering
        await page.waitForTimeout(4000);

        // Get the outerHTML of the modal
        const modalHtml = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]');
            return dialog ? dialog.outerHTML : null;
        });

        if (modalHtml) {
            const fs = require('fs');
            fs.writeFileSync('ubereats_modal_raw.html', modalHtml);
            console.log("✅ Success! Modal HTML saved to ubereats_modal_raw.html");
        } else {
            console.log("❌ Could not find div[role='dialog']. Dumping entire body instead just in case.");
            const bodyHtml = await page.evaluate(() => document.body.outerHTML);
            const fs = require('fs');
            fs.writeFileSync('ubereats_body_fallback.html', bodyHtml);
        }

    } else {
        console.log("Could not find 'Menü 1' on the page. Please check the URL or if the restaurant is closed.");
    }

  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    console.log("Closing browser in 5 seconds...");
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
