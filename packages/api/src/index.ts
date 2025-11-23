import express from 'express';
import { route } from '@ucr/cognition/src/router.js';
import bodyParser from 'body-parser';
import http from 'node:http';
import { attachWebSocket } from './ws.js';

const app = express();
app.use(bodyParser.json());

app.post('/execute', async (req, res) => {
  try {
    const result = await route(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = http.createServer(app);
attachWebSocket(server);

server.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
