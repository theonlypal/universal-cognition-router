import { chromium, Browser } from 'playwright';

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    const content = await page.textContent('body');
    return { url, title, content: content || '' };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
