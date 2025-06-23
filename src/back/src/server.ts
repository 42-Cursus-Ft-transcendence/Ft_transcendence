// src/back/src/server.ts

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import sqlite3 from 'sqlite3';

// 1) Load env from your project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 2) Compute the publicDir for static files
const prodStatic = path.resolve(__dirname, '../public');                // after `npm run build` or in Docker
const devStatic  = path.resolve(__dirname, '../../../src/front/public'); // during local `ts-node-dev`

let publicDir: string;
if (fs.existsSync(prodStatic)) {
  publicDir = prodStatic;
} else if (fs.existsSync(devStatic)) {
  publicDir = devStatic;
} else {
  console.error('❌ Cannot locate your frontend build – checked:', prodStatic, devStatic);
  process.exit(1);
}
console.log('⛳️ Serving static from:', publicDir);

// 3) Create Fastify instance
const app = Fastify();

// 4) Register static plugin (wildcard=true so *all* files* under publicDir are served)
app.register(fastifyStatic, {
  root:     publicDir,
  prefix:   '/',          // serve at the root URL
  index:    ['index.html'],
  wildcard: true
});

// 5) Fallback for /favicon.ico (in case static plugin somehow misses it)
app.get('/favicon.ico', (_req, reply) => {
  const iconPath = path.join(publicDir, 'favicon.ico');
  if (fs.existsSync(iconPath)) {
    const icon = fs.readFileSync(iconPath);
    reply
      .header('Content-Type', 'image/x-icon')
      .send(icon);
  } else {
    // no icon? send 204 No Content instead of a 404
    reply.code(204).send();
  }
});

// 6) SPA‐style fallback: any other unknown GET → index.html
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html');
});

// 7) SQLite setup
const dbRel  = process.env.DB_PATH || '../data/db.sqlite';
const dbPath = path.resolve(__dirname, dbRel);
const dbDir  = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error('SQLite error:', err);
  else console.log('✅ SQLite ready at', dbPath);
});
db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT    NOT NULL,
    score  INTEGER NOT NULL,
    date   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 8) Your API routes
app.get('/api/hello', async () => ({ hello: 'world' }));

// 9) Start the server
app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});
