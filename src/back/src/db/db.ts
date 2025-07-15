import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";

const dbPath = path.resolve(
  __dirname,
  process.env.DB_PATH || "../../data/db.sqlite"
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err);
  else console.log("✅ SQLite ready");
});

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      idUser            INTEGER PRIMARY KEY,
      oauthSub          TEXT UNIQUE,
      userName          TEXT UNIQUE,
      email             TEXT,
      password          TEXT,
      address           TEXT,
      privkey           TEXT,
      registrationDate  TEXT,
      connectionStatus  INTEGER,
      totpSecret         TEXT,
      isTotpEnabled      INTEGER DEFAULT 0,
      avatarURL          TEXT
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS RecoveryCode (
      idCode             INTEGER PRIMARY KEY AUTOINCREMENT,
      userId             INTEGER NOT NULL,
      codeHash           TEXT NOT NULL,
      used               INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES User(idUser)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Match(
      idMatch           INTEGER PRIMARY KEY,
      matchDate         TEXT,
      player1Score      INTEGER,
      player2Score      INTEGER,
      winnerId          INTEGER,
      FOREIGN KEY(winnerId) REFERENCES User(idUser)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS User_Match (
      userId            INTEGER ,
      matchDate         TEXT,
      matchId           INTEGER,
      PRIMARY KEY (userId, matchId),
      FOREIGN KEY(userId) REFERENCES User(idUser),
      FOREIGN KEY(matchId) REFERENCES Match(idMatch)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS PlayerRanking (
      userId            INTEGER PRIMARY KEY,
      elo               INTEGER NOT NULL DEFAULT 1200,
      wins              INTEGER NOT NULL DEFAULT 0,
      losses            INTEGER NOT NULL DEFAULT 0,
      gamesPlayed       INTEGER NOT NULL DEFAULT 0,
      lastMatchDate     TEXT,
      FOREIGN KEY(userId) REFERENCES User(idUser)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS RankedMatch (
      matchId           TEXT PRIMARY KEY,
      player1Id         INTEGER NOT NULL,
      player2Id         INTEGER NOT NULL,
      player1Score      INTEGER NOT NULL,
      player2Score      INTEGER NOT NULL,
      winnerId          INTEGER,
      player1EloChange  INTEGER NOT NULL,
      player2EloChange  INTEGER NOT NULL,
      matchDate         TEXT NOT NULL,
      matchDuration     INTEGER,
      FOREIGN KEY(player1Id) REFERENCES User(idUser),
      FOREIGN KEY(player2Id) REFERENCES User(idUser),
      FOREIGN KEY(winnerId) REFERENCES User(idUser)
    );
  `);
  db.run(`INSERT OR IGNORE INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus)
                VALUES ('Jarvis', 'antarctica', 0, 'forever', 0, 0, 0)`);
});
