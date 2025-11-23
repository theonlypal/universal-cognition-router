import { randomUUID } from 'node:crypto';
import { buildDefaultRegistry, Registry } from './tools.js';
import { evaluateTask, fallbackTool } from './evaluator.js';
import { MemoryStore } from './memory.js';

export interface Instruction {
  id?: string;
  text: string;
  tool?: string;
  payload?: any;
}

export interface RouterResponse {
  id: string;
  status: 'ok' | 'error';
  logs: string[];
  result?: any;
  error?: string;
}

export class CognitionRouter {
  private registry: Registry;
  private memory: MemoryStore;

  constructor(registry = buildDefaultRegistry(), memory = new MemoryStore()) {
    this.registry = registry;
    this.memory = memory;
  }

  async initialize(): Promise<void> {
    await this.memory.load();
  }

  async execute(instruction: Instruction): Promise<RouterResponse> {
    const logs: string[] = [];
    const id = instruction.id ?? randomUUID();
    const evalResult = evaluateTask(instruction.text);
    if (!evalResult.safe) {
      return { id, status: 'error', logs, error: evalResult.reason };
    }

    let toolName = instruction.tool;
    if (!toolName) {
      const categoryTool = fallbackTool(evalResult.category);
      if (categoryTool) {
        toolName = categoryTool;
        logs.push(`Auto-selected tool: ${toolName}`);
      } else {
        logs.push('No tool specified and no fallback found.');
        return { id, status: 'error', logs, error: 'Unable to determine tool' };
      }
    }

    const payload = instruction.payload || {};
    logs.push(`Executing tool ${toolName}`);
    try {
      const result = await this.registry.run(toolName, payload);
      await this.memory.add({ id, content: JSON.stringify({ instruction, result }) });
      return { id, status: 'ok', logs, result };
    } catch (err) {
      logs.push(`Error executing tool: ${(err as Error).message}`);
      return { id, status: 'error', logs, error: (err as Error).message };
    }
  }
}

export async function route(instruction: Instruction): Promise<RouterResponse> {
  const router = new CognitionRouter();
  await router.initialize();
  return router.execute(instruction);
}
