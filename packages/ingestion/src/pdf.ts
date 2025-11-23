import fs from 'node:fs/promises';
import pdf from 'pdf-parse';

export interface PdfResult {
  text: string;
  info: pdf.PDFInfo;
}

export async function parsePdf(path: string): Promise<PdfResult> {
  const data = await fs.readFile(path);
  const result = await pdf(data);
  return { text: result.text, info: result.info };
}
