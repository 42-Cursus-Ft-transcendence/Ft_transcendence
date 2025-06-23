// src/back/src/server.ts

import path from 'path';
import fs   from 'fs';

// 0) Charger les variables d’environnement depuis .env
import dotenv from 'dotenv';
dotenv.config({
  // __dirname = .../src/back/src
  path: path.resolve(__dirname, '../../.env')
});

import Fastify        from 'fastify';
import fastifyStatic  from '@fastify/static';
import sqlite3        from 'sqlite3';

const app = Fastify();

// ─── 1) Ouvrir SQLite ────────────────────────────────────────────
// DB_PATH relatif à __dirname via .env (ex: "../data/db.sqlite")
const dbRel = process.env.DB_PATH || '../data/db.sqlite';
const dbPath = path.resolve(__dirname, dbRel);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
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

// ─── 2) Route d’API d’exemple ───────────────────────────────────
app.get('/api/hello', async () => ({ hello: 'world' }));

// ─── 3) Déterminer le dossier static depuis .env ────────────────
// Variables .env (chemins relatifs à __dirname)
const prodStaticRel = process.env.PROD_STATIC_REL || '../public';
const devStaticRel  = process.env.DEV_STATIC_REL  || '../../../src/front/public';

// Résolution absolue
const prodStatic = path.resolve(__dirname, prodStaticRel);
const devStatic  = path.resolve(__dirname, devStaticRel);

let publicDir: string;
if (fs.existsSync(prodStatic)) {
  publicDir = prodStatic;
} else if (fs.existsSync(devStatic)) {
  publicDir = devStatic;
} else {
  console.error('❌ Cannot find public directory:', prodStatic, devStatic);
  process.exit(1);
}
console.log('⛳️ Serving static from:', publicDir);

// ─── 4) Servir les fichiers statiques & SPA fallback ────────────
app.register(fastifyStatic, {
  root:   publicDir,
  prefix: '/',
  index:  ['index.html']
});
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html');
});

// ─── 5) Démarrage du serveur ────────────────────────────────────
app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});
