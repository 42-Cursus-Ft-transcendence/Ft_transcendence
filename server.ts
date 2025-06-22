// import Fastify from 'fastify';
// import fastifyStatic from '@fastify/static';
// import sqlite3 from 'sqlite3';
// import path from 'path';
// import { fileURLToPath } from 'url';

// // For ES module __dirname polyfill
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const fastify = Fastify({ logger: true });

// // SQLite setup
// const db = new sqlite3.Database('./database.sqlite');

// db.run(`CREATE TABLE IF NOT EXISTS items (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   name TEXT NOT NULL
// )`);

// // Serve static files from public/
// fastify.register(fastifyStatic, {
//   root: path.join(__dirname, 'public'),
//   prefix: '/',
// });

// fastify.get('/', (req, reply) => {
//   return reply.sendFile('index.html');
// });

// // Example API endpoint
// fastify.get('/api/items', async (request, reply) => {
//   return new Promise((resolve, reject) => {
//     db.all('SELECT * FROM items', (err, rows) => {
//       if (err) return reject(err);
//       resolve(rows);
//     });
//   });
// });

// // Start server
// const start = async () => {
//   try {
//     await fastify.listen({ port: 3000, host: '0.0.0.0' });
//     console.log('Server running on http://localhost:3000');
//   } catch (err) {
//     fastify.log.error(err);
//     process.exit(1);
//   }
// };

// start();