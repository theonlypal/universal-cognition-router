import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ShellCommand {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  code: number;
}

const BLOCKED = ['rm -rf /', 'shutdown', 'reboot'];

export async function runShellCommand(input: ShellCommand): Promise<ShellResult> {
  if (BLOCKED.some((b) => input.command.includes(b))) {
    throw new Error('Blocked command detected');
  }
  const { stdout, stderr } = await execAsync(input.command, {
    cwd: input.cwd,
    timeout: input.timeoutMs ?? 60000,
    env: { ...process.env, ...(input.env || {}) },
    maxBuffer: 10 * 1024 * 1024
  });
  return { stdout, stderr, code: 0 };
}
