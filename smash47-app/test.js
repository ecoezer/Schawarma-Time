import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('https://www.ubereats.com/de/store/smash47/B2AvUzn_WnSaAk9ahNWd2A?diningMode=DELIVERY&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMlN0ZWluYmVyZ3N0cmElQzMlOUZlJTIyJTJDJTIycmVmZXJlbmNlJTIyJTNBJTIyRWl0VGRHVnBibUpsY21kemRISmh3NTlsTENBek1URXpPU0JJYVd4a1pYTm9aV2x0TENCSFpYSnRZVzU1SWk0cUxBb1VDaElKcFVWNXJMNnZ1a2NSWS1aaEpYZkZFT2dTRkFvU0NTUEswZTZwcjdwSEVkS0RjZVQxd2U2TyUyMiUyQyUyMnJlZmVyZW5jZVR5cGUlMjIlM0ElMjJnb29nbGVfcGxhY2VzJTIyJTJDJTIybGF0aXR1ZGUlMjIlM0E1Mi4xNDEwMjclMkMlMjJsb25naXR1ZGUlMjIlM0E5LjkzMjcxNTElN0Q%3D', {waitUntil: 'networkidle2'});
    const image = await page.evaluate(() => {
        const img = document.querySelector('img');
        const allImgs = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src.startsWith('http'));
        return allImgs;
    });
    console.log(image);
    await browser.close();
})();
