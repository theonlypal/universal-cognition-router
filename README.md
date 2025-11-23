# Universal Cognition Router (UCR)

Production-grade monorepo providing ingestion, action, agent, cognition routing, and API layers for multi-surface AI automation.

## Structure

- `packages/cognition`: Routing, memory, evaluator, and tool registry.
- `packages/ingestion`: PDF, OCR, video/audio transcription, email parsing, and web scraping utilities.
- `packages/actions`: HTTP, filesystem, DNS, and deployment helpers.
- `packages/agents`: Device (Swift bridge), shell, and browser agents.
- `packages/api`: REST and WebSocket endpoints exposing the router.

## Setup

1. Install pnpm (v9+).
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build packages:
   ```bash
   pnpm build
   ```

### Environment Variables

- `OPENAI_API_KEY`: Required for Whisper transcription.
- `PORT`: Optional API port (default 3000).
- `VERCEL_TOKEN`: For deployment actions (pass as payload).
- `CLOUDFLARE_TOKEN`, `CLOUDFLARE_ZONE_ID`: For DNS actions.
- `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_CLIENT_IP`: For Namecheap DNS.

## Running API

```bash
pnpm --filter @ucr/api run build
pnpm --filter @ucr/api start
```

POST `/execute` with JSON:
```json
{
  "text": "scrape example.com",
  "tool": "web.scrape",
  "payload": { "url": "https://example.com" }
}
```

WebSocket `/ws`: send instruction JSON, receive router response.

## TypeScript Usage

```ts
import { route } from '@ucr/cognition/src/router.js';

const response = await route({
  text: 'Transcribe audio',
  tool: 'audio.transcribe',
  payload: { audioPath: '/tmp/sample.wav' }
});
console.log(response);
```

### Example Tool Invocation

```ts
import { buildDefaultRegistry } from '@ucr/cognition/src/tools.js';

const registry = buildDefaultRegistry();
const result = await registry.run('fs.writeText', { path: '/tmp/file.txt', content: 'hello' });
```
