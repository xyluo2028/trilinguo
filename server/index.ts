import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import express from 'express';
import { parseMaterialPack } from '../shared/content.ts';
import { createApp, errorHandler } from './app.ts';
import { LearningStore } from './store.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
const dbPath = path.resolve(process.env.TRILINGUO_DB ?? path.join(root, '.data/progress.sqlite'));
mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
const pack = parseMaterialPack(JSON.parse(readFileSync(path.join(root, 'content/polite-requests.json'), 'utf8')));
const store = new LearningStore(db, pack);
const app = createApp(store, [
  `http://127.0.0.1:${port}`, `http://localhost:${port}`,
  'http://127.0.0.1:5173', 'http://localhost:5173',
]);
const dist = path.join(root, 'dist');
if (existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { index: false }));
  app.get('/', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(errorHandler);
// This prototype has no sign-in. Keep the listener private until family access is implemented.
const server = createServer(app);
server.on('error', error => {
  console.error(`Could not start Trilinguo: ${error.message}`);
  db.close();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Trilinguo listening on port ${port}; SQLite progress enabled.`));
function close() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
