export type TaskCategory = 'ingestion' | 'action' | 'agent' | 'unknown';

export interface EvaluationResult {
  category: TaskCategory;
  safe: boolean;
  reason?: string;
}

const dangerousPatterns = [/rm -rf/, /shutdown/, /reboot/, /DROP TABLE/i];

export function evaluateTask(instruction: string): EvaluationResult {
  for (const pattern of dangerousPatterns) {
    if (pattern.test(instruction)) {
      return { category: 'unknown', safe: false, reason: `Unsafe pattern detected: ${pattern}` };
    }
  }
  const lowered = instruction.toLowerCase();
  if (lowered.includes('scrape') || lowered.includes('parse') || lowered.includes('transcribe')) {
    return { category: 'ingestion', safe: true };
  }
  if (lowered.includes('deploy') || lowered.includes('http') || lowered.includes('request') || lowered.includes('dns')) {
    return { category: 'action', safe: true };
  }
  if (lowered.includes('shell') || lowered.includes('browser') || lowered.includes('device')) {
    return { category: 'agent', safe: true };
  }
  return { category: 'unknown', safe: true };
}

export function fallbackTool(category: TaskCategory): string | undefined {
  switch (category) {
    case 'ingestion':
      return 'web.scrape';
    case 'action':
      return 'http.request';
    case 'agent':
      return 'agent.shell';
    default:
      return undefined;
  }
}
