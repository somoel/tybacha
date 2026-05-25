import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './interfaces/http/app.js';

const appPromise = buildApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise;
  await app.ready();
  app.server.emit('request', req, res);
}

