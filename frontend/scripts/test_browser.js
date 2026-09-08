import { chromium } from 'playwright';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000');
  console.log('Page loaded! Title:', await page.title());
  await browser.close();
  console.log('Playwright Chromium working perfectly!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
