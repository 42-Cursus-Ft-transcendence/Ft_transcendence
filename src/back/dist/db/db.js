"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const dbPath = path_1.default.resolve(__dirname, process.env.DB_PATH || "../../data/db.sqlite");
fs_1.default.mkdirSync(path_1.default.dirname(dbPath), { recursive: true });
exports.db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err)
        console.error(err);
    else
        console.log("✅ SQLite ready");
});
exports.db.serialize(() => {
    exports.db.run(`PRAGMA foreign_keys = ON;`);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS User (
      idUser            INTEGER PRIMARY KEY,
      oauthSub          TEXT UNIQUE,
      userName          TEXT UNIQUE,
      email             TEXT,
      password          TEXT,
      address           TEXT,
      privkey           TEXT,
      registrationDate  TEXT,
      connectionStatus  INTEGER
    );
  `);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS Match(
      idMatch           INTEGER PRIMARY KEY,
      matchDate         TEXT,
      player1Score      INTEGER,
      player2Score      INTEGER,
      winnerId          INTEGER,
      FOREIGN KEY(winnerId) REFERENCES User(idUSer)
    );
  `);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS User_Match (
      userId            INTEGER ,
      matchDate         TEXT,
      matchId           INTEGER,
      PRIMARY KEY (userId, matchId),
      FOREIGN KEY(userId) REFERENCES User(idUSer),
      FOREIGN KEY(matchId) REFERENCES Match(idMatch)
    );
  `);
    exports.db.run(`INSERT OR IGNORE INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus)
                VALUES ('Jarvis', 'antarctica', 0, 'forever', 0, 0, 0)`);
});
