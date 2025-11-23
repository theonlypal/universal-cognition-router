import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import { CognitionRouter } from '@ucr/cognition/src/router.js';

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const router = new CognitionRouter();
  router.initialize();

  wss.on('connection', (socket) => {
    socket.on('message', async (data) => {
      try {
        const instruction = JSON.parse(data.toString());
        const result = await router.execute(instruction);
        socket.send(JSON.stringify(result));
      } catch (err) {
        socket.send(JSON.stringify({ status: 'error', error: (err as Error).message }));
      }
    });
  });
}
