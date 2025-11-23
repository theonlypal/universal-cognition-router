import fs from 'node:fs/promises';
import path from 'node:path';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  vector?: number[];
}

export class MemoryStore {
  private storePath: string;
  private data: MemoryEntry[] = [];

  constructor(storePath = path.join(process.cwd(), 'memory.json')) {
    this.storePath = storePath;
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.storePath, 'utf8');
      this.data = JSON.parse(content);
    } catch {
      this.data = [];
    }
  }

  async persist(): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  async add(entry: Omit<MemoryEntry, 'timestamp'>): Promise<MemoryEntry> {
    const record: MemoryEntry = { ...entry, timestamp: Date.now() };
    this.data.push(record);
    await this.persist();
    return record;
  }

  async update(id: string, content: string, vector?: number[]): Promise<void> {
    const item = this.data.find((m) => m.id === id);
    if (item) {
      item.content = content;
      item.timestamp = Date.now();
      if (vector) item.vector = vector;
      await this.persist();
    }
  }

  getContext(limit: number): MemoryEntry[] {
    return [...this.data]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  summarize(maxLength = 500): string {
    const combined = this.data
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => e.content)
      .join('\n');
    return combined.length > maxLength ? `${combined.slice(0, maxLength)}...` : combined;
  }

  similaritySearch(queryVector: number[], topK = 3): MemoryEntry[] {
    const scored = this.data
      .filter((d) => d.vector && d.vector.length === queryVector.length)
      .map((d) => ({ entry: d, score: cosineSimilarity(queryVector, d.vector as number[]) }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topK).map((s) => s.entry);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return normA === 0 || normB === 0 ? 0 : dot / (normA * normB);
}
