import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './interfaces/http/app.js';

const appPromise = buildApp().catch((error) => {
  console.error(
    JSON.stringify({
      event: 'app_boot_failed',
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
    }),
  );

  throw error;
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log(
    JSON.stringify({
      event: 'vercel_handler_in',
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      accessControlRequestMethod: req.headers['access-control-request-method'],
      accessControlRequestHeaders: req.headers['access-control-request-headers'],
    }),
  );

  try {
    const app = await appPromise;
    await app.ready();
    app.server.emit('request', req, res);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'vercel_handler_failed',
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        error: {
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
    );

    const origin = req.headers.origin;
    if (origin === 'https://tybacha.vercel.app') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    res.statusCode = req.method === 'OPTIONS' ? 204 : 500;
    res.end(req.method === 'OPTIONS' ? undefined : JSON.stringify({ code: 'BOOT_ERROR', message: 'API failed to boot' }));
  }
}
