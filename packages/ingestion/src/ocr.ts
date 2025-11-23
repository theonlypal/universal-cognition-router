import { createWorker } from 'tesseract.js';
import fs from 'node:fs/promises';

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function runOcr(imagePath: string, lang = 'eng'): Promise<OcrResult> {
  const worker = await createWorker(lang);
  const image = await fs.readFile(imagePath);
  try {
    const { data } = await worker.recognize(image);
    await worker.terminate();
    return { text: data.text, confidence: data.confidence };
  } finally {
    // ensure termination if recognize fails
    try {
      await worker.terminate();
    } catch (err) {
      // ignore
    }
  }
}
