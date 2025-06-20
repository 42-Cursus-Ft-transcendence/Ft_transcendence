import Fastify from 'fastify';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

// SQLite setup
const db = new sqlite3.Database('./database.sqlite');

// Serve static files from public/
fastify.register(import('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

// Example API endpoint
fastify.get('/api/items', async (request, reply) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM items', (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
});

// Start server
fastify.listen({ port: 3000, host: '0.0.0.0' }, err => {
  if (err) throw err;
  console.log('Server running on http://localhost:3000');
});