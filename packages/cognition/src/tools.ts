import Ajv from 'ajv';
import { parsePdf } from '@ucr/ingestion/dist/pdf.js';
import { runOcr } from '@ucr/ingestion/dist/ocr.js';
import { transcribeVideo } from '@ucr/ingestion/dist/video.js';
import { transcribeAudio } from '@ucr/ingestion/dist/audio.js';
import { parseEml, fetchLatestEmail } from '@ucr/ingestion/dist/email.js';
import { scrapePage } from '@ucr/ingestion/dist/scraper.js';
import { httpJson, httpRequest } from '@ucr/actions/dist/http.js';
import { writeJson, readJson, writeText, readText, removeFile } from '@ucr/actions/dist/filesystem.js';
import { createCloudflareRecord, createNamecheapRecord } from '@ucr/actions/dist/dns.js';
import { triggerVercelDeploy } from '@ucr/actions/dist/deploy.js';
import { runShellCommand } from '@ucr/agents/dist/shell/shell-agent.js';
import { runBrowserTask } from '@ucr/agents/dist/browser/browser-agent.js';

export interface Tool<Input = any, Output = any> {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
  handler: (input: Input) => Promise<Output>;
}

export class Registry {
  private tools = new Map<string, Tool>();
  private ajv = new Ajv({ removeAdditional: 'all', coerceTypes: true });

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  async run(name: string, input: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    const validate = this.ajv.compile(tool.inputSchema);
    if (!validate(input)) {
      throw new Error(`Invalid input for ${name}: ${this.ajv.errorsText(validate.errors)}`);
    }
    const result = await tool.handler(input);
    const validateOutput = this.ajv.compile(tool.outputSchema);
    if (!validateOutput(result)) {
      throw new Error(`Invalid output from ${name}: ${this.ajv.errorsText(validateOutput.errors)}`);
    }
    return result;
  }
}

export function buildDefaultRegistry(): Registry {
  const registry = new Registry();
  registry.register({
    name: 'pdf.parse',
    description: 'Parse a PDF file and extract text',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    },
    outputSchema: {
      type: 'object',
      properties: { text: { type: 'string' }, info: { type: 'object' } },
      required: ['text', 'info']
    },
    handler: ({ path }) => parsePdf(path)
  });

  registry.register({
    name: 'ocr.run',
    description: 'Perform OCR on an image',
    inputSchema: { type: 'object', properties: { imagePath: { type: 'string' }, lang: { type: 'string', nullable: true } }, required: ['imagePath'] },
    outputSchema: { type: 'object', properties: { text: { type: 'string' }, confidence: { type: 'number' } }, required: ['text', 'confidence'] },
    handler: ({ imagePath, lang }) => runOcr(imagePath, lang)
  });

  registry.register({
    name: 'video.transcribe',
    description: 'Transcribe a video to text using Whisper',
    inputSchema: { type: 'object', properties: { videoPath: { type: 'string' } }, required: ['videoPath'] },
    outputSchema: { type: 'object', properties: { transcript: { type: 'string' } }, required: ['transcript'] },
    handler: ({ videoPath }) => transcribeVideo(videoPath)
  });

  registry.register({
    name: 'audio.transcribe',
    description: 'Transcribe an audio file with Whisper',
    inputSchema: { type: 'object', properties: { audioPath: { type: 'string' } }, required: ['audioPath'] },
    outputSchema: { type: 'object', properties: { transcript: { type: 'string' } }, required: ['transcript'] },
    handler: ({ audioPath }) => transcribeAudio(audioPath)
  });

  registry.register({
    name: 'email.parse',
    description: 'Parse raw EML content',
    inputSchema: { type: 'object', properties: { content: { instanceof: 'Buffer' }, text: { type: 'string' } }, anyOf: [ { required: ['content'] }, { required: ['text'] } ] },
    outputSchema: { type: 'object', properties: { subject: { type: 'string' }, text: { type: 'string' }, html: { type: 'string', nullable: true }, from: { type: 'string', nullable: true }, to: { type: 'string', nullable: true } }, required: ['subject', 'text'] },
    handler: ({ content, text }) => parseEml(content ?? text)
  });

  registry.register({
    name: 'email.fetchLatest',
    description: 'Fetch latest email via IMAP',
    inputSchema: { type: 'object', properties: { host: { type: 'string' }, port: { type: 'number' }, secure: { type: 'boolean' }, auth: { type: 'object', properties: { user: { type: 'string' }, pass: { type: 'string' } }, required: ['user', 'pass'] } }, required: ['host', 'port', 'secure', 'auth'] },
    outputSchema: { type: 'object', properties: { subject: { type: 'string' }, text: { type: 'string' } }, required: ['subject', 'text'] },
    handler: ({ host, port, secure, auth }) => fetchLatestEmail({ host, port, secure, auth })
  });

  registry.register({
    name: 'web.scrape',
    description: 'Scrape webpage content',
    inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    outputSchema: { type: 'object', properties: { url: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' } }, required: ['url', 'title', 'content'] },
    handler: ({ url }) => scrapePage(url)
  });

  registry.register({
    name: 'http.request',
    description: 'Perform an HTTP request with retry',
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, options: { type: 'object' } }, required: ['url'] },
    outputSchema: { type: 'object', properties: { status: { type: 'number' }, body: { type: 'string' } }, required: ['status', 'body'] },
    handler: async ({ url, options }) => {
      const response = await httpRequest(url, options);
      const body = await response.text();
      return { status: response.status, body };
    }
  });

  registry.register({
    name: 'http.json',
    description: 'Perform an HTTP request returning JSON',
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, options: { type: 'object' } }, required: ['url'] },
    outputSchema: { type: 'object' },
    handler: ({ url, options }) => httpJson(url, options)
  });

  registry.register({
    name: 'fs.writeText',
    description: 'Write text to a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
    outputSchema: { type: 'object', properties: { success: { type: 'boolean' } }, required: ['success'] },
    handler: async ({ path, content }) => {
      await writeText(path, content);
      return { success: true };
    }
  });

  registry.register({
    name: 'fs.readText',
    description: 'Read text from a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    outputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
    handler: async ({ path }) => ({ content: await readText(path) })
  });

  registry.register({
    name: 'fs.writeJson',
    description: 'Write JSON to a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, data: { type: 'object' } }, required: ['path', 'data'] },
    outputSchema: { type: 'object', properties: { success: { type: 'boolean' } }, required: ['success'] },
    handler: async ({ path, data }) => { await writeJson(path, data); return { success: true }; }
  });

  registry.register({
    name: 'fs.readJson',
    description: 'Read JSON from a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    outputSchema: { type: 'object' },
    handler: ({ path }) => readJson(path)
  });

  registry.register({
    name: 'fs.remove',
    description: 'Remove a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    outputSchema: { type: 'object', properties: { success: { type: 'boolean' } }, required: ['success'] },
    handler: async ({ path }) => { await removeFile(path); return { success: true }; }
  });

  registry.register({
    name: 'dns.cloudflareCreate',
    description: 'Create DNS record in Cloudflare',
    inputSchema: { type: 'object', properties: { token: { type: 'string' }, zoneId: { type: 'string' }, record: { type: 'object' } }, required: ['token', 'zoneId', 'record'] },
    outputSchema: { type: 'object' },
    handler: ({ token, zoneId, record }) => createCloudflareRecord({ token, zoneId }, record)
  });

  registry.register({
    name: 'dns.namecheapCreate',
    description: 'Create DNS record in Namecheap',
    inputSchema: { type: 'object', properties: { apiUser: { type: 'string' }, apiKey: { type: 'string' }, clientIp: { type: 'string' }, username: { type: 'string', nullable: true }, domain: { type: 'string' }, host: { type: 'string' }, type: { type: 'string' }, address: { type: 'string' } }, required: ['apiUser', 'apiKey', 'clientIp', 'domain', 'host', 'type', 'address'] },
    outputSchema: { type: 'string' },
    handler: ({ apiUser, apiKey, clientIp, username, domain, host, type, address }) => createNamecheapRecord({ apiUser, apiKey, clientIp, username }, domain, host, type, address)
  });

  registry.register({
    name: 'deploy.vercel',
    description: 'Trigger a Vercel deployment',
    inputSchema: { type: 'object', properties: { token: { type: 'string' }, projectId: { type: 'string' }, teamId: { type: 'string', nullable: true }, payload: { type: 'object' } }, required: ['token', 'projectId', 'payload'] },
    outputSchema: { type: 'object' },
    handler: ({ token, projectId, teamId, payload }) => triggerVercelDeploy({ token, projectId, teamId, payload })
  });

  registry.register({
    name: 'agent.shell',
    description: 'Execute shell command safely',
    inputSchema: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string', nullable: true }, timeoutMs: { type: 'number', nullable: true } }, required: ['command'] },
    outputSchema: { type: 'object', properties: { stdout: { type: 'string' }, stderr: { type: 'string' }, code: { type: 'number' } }, required: ['stdout', 'stderr', 'code'] },
    handler: (input) => runShellCommand(input)
  });

  registry.register({
    name: 'agent.browser',
    description: 'Run a browser automation task',
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, actions: { type: 'array', items: { type: 'object' } } }, required: ['url'] },
    outputSchema: { type: 'object', properties: { url: { type: 'string' }, content: { type: 'string' } }, required: ['url', 'content'] },
    handler: (input) => runBrowserTask(input)
  });

  return registry;
}
