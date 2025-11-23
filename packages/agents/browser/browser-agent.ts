import { chromium, Browser } from 'playwright';

export interface BrowserTask {
  url: string;
  actions?: Array<{ type: 'click' | 'fill'; selector: string; value?: string }>;
}

export interface BrowserResult {
  url: string;
  content: string;
}

export async function runBrowserTask(task: BrowserTask): Promise<BrowserResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(task.url, { waitUntil: 'networkidle', timeout: 45000 });
    if (task.actions) {
      for (const action of task.actions) {
        if (action.type === 'click') {
          await page.click(action.selector);
        } else if (action.type === 'fill' && action.value !== undefined) {
          await page.fill(action.selector, action.value);
        }
      }
    }
    const content = await page.content();
    return { url: task.url, content };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
