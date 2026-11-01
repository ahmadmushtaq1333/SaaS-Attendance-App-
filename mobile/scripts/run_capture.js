const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser via Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--enable-webgl',
    ],
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('Navigating to capture_emblem.html...');
  await page.goto('http://127.0.0.1:3000/capture_emblem.html', { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('Waiting for #DONE selector...');
  await page.waitForSelector('#DONE', { timeout: 30000 });

  console.log('Capture completed successfully!');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('Puppeteer capture failed:', err);
  process.exit(1);
});
