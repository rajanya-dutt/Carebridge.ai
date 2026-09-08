import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000');
  console.log('Title:', await page.title());
  await browser.close();
  console.log('Playwright test successful!');
}

test().catch(console.error);
