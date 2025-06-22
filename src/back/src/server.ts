import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const app = Fastify();

// Préparer le chemin vers la base SQLite
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/db.sqlite');
const dbDir  = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Ouvrir (ou créer) la base de données
const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error('SQLite error:', err);
  else console.log('SQLite ready at', dbPath);
});

// Créer la table “scores” si elle n’existe pas
db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT NOT NULL,
    score INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Exemple de route API
app.get('/api/hello', async () => ({ hello: 'world' }));

// Configurer le dossier statique
const publicDir = path.join(__dirname, '../public');
app.register(fastifyStatic, {
  root: publicDir,
  prefix: '/',
  index: ['index.html']
});

// Fallback SPA : toutes routes inconnues renvoient index.html
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html');
});

// Démarrage du serveur
app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});
