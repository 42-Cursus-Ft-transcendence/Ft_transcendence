import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve(__dirname, process.env.DB_PATH || '../../data/db.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new sqlite3.Database(dbPath, err => {
    if(err)
        console.error(err);
    else
        console.log('✅ SQLite ready');
});

db.serialize(() =>
{
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      idUser            INTEGER PRIMARY KEY,
      userName          TEXT UNIQUE,
      email             TEXT,
      password          TEXT,
      address           TEXT,
      privkey           TEXT,
      registrationDate  TEXT,
      connectionStatus  INTEGER
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Match(
      idMatch           INTEGER PRIMARY KEY,
      matchDate         TEXT,
      player1Score      INTEGER,
      player2Score      INTEGER,
      winnerId          INTEGER,
      FOREIGN KEY(winnerId) REFERENCES User(idUSer)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS User_Match (
      idUserMatch       INTEGER PRIMARY KEY,
      userId            INTEGER ,
      matchDate         TEXT,
      matchId           INTEGER,
      FOREIGN KEY(userId) REFERENCES User(idUSer),
      FOREIGN KEY(matchId) REFERENCES Match(idMatch)
    );
  `);
  db.run(`INSERT OR IGNORE INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus)
                VALUES ('Jarvis', 'antarctica', 0, 'forever', 0, 0, 0)`)
});

