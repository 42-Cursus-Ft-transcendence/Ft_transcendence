"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAsync = getAsync;
exports.default = userRoutes;
exports.createGame = createGame;
const db_1 = require("../db/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const ethers_1 = require("ethers");
function runAsync(sql, values) {
    return new Promise((resolve, reject) => {
        db_1.db.run(sql, values, function (error) {
            if (error) {
                reject(error);
            }
            else {
                resolve(this.lastID);
            }
        });
    });
}
function getAsync(sql, params) {
    return new Promise((resolve, rejects) => {
        db_1.db.get(sql, params, (err, row) => {
            if (err)
                rejects(err);
            else
                resolve(row ?? null);
        });
    });
}
async function userRoutes(app) {
    console.log("🛠️  userRoutes mounted");
    app.post("/signup", async (request, reply) => {
        console.log(">> Reçu POST /user");
        // Récupère et valide le body
        const { userName, email, password } = request.body;
        if (!userName || !email || !password)
            return reply
                .status(400)
                .send({ error: "userName, email and password required" });
        try {
            const hashPass = await bcrypt_1.default.hash(password, 10);
            const now = new Date().toString();
            const userWallet = ethers_1.Wallet.createRandom();
            const address = userWallet.address;
            const privKey = userWallet.privateKey;
            const idUser = await runAsync(`INSERT INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus)
                VALUES (?, ?, ?, ?, ?, ?, 0)`, [userName, email, hashPass, now, address, privKey]);
            return reply.status(201).send({ idUser });
        }
        catch (err) {
            if (err.code === "SQLITE_CONSTRAINT") {
                return reply.status(409).send({ error: "Username already taken" });
            }
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
        const idUser = request.user.sub;
        const userName = request.user.userName;
        try {
            const res = await getAsync(`SELECT email FROM User WHERE idUser = ?`, [idUser]);
            if (!res)
                return reply.status(401).send({ error: "User not found" });
            reply.status(200).send({
                idUser,
                userName,
                email: res.email,
            });
        }
        catch (err) {
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    app.post("/login", async (request, reply) => {
        console.log(">> Recu POST /login");
        const { userName, password } = request.body;
        if (!userName || !password)
            return reply
                .status(400)
                .send({ error: "userName and password required" });
        try {
            const user = await getAsync(`SELECT idUser, email, password, connectionStatus FROM User WHERE userName = ?`, [userName]);
            if (!user)
                return reply
                    .status(401)
                    .send({ error: "Invalid username or password" });
            const match = await bcrypt_1.default.compare(password, user.password);
            if (!match)
                return reply
                    .status(401)
                    .send({ error: "Invalid username or password" });
            await runAsync(`UPDATE User SET connectionStatus = 1 WHERE idUser = ?`, [
                user.idUser,
            ]);
            const token = app.jwt.sign({ sub: user.idUser, userName }, { expiresIn: "2h" });
            return reply
                .setCookie("token", token, {
                // signed: true,
                httpOnly: true,
                path: "/",
                sameSite: "strict",
                // secure:   true
            })
                .status(200)
                .send({
                userName,
                email: user.email,
                idUser: user.idUser,
            });
        }
        catch (err) {
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    app.post("/logout", { preHandler: [app.authenticate] }, async (request, reply) => {
        // Récupère directement l’ID depuis le payload du JWT
        const idUser = request.user.sub;
        const cookieOpt = {
            httpOnly: true,
            path: "/",
            maxAge: -1,
            sameSite: "strict",
            // secure:   true
        };
        try {
            await runAsync(`UPDATE User SET connectionStatus = 0 WHERE idUser = ?`, [idUser]);
            return reply
                .setCookie("token", "", cookieOpt)
                .status(200)
                .send({ ok: true });
        }
        catch (err) {
            return reply
                .setCookie("token", "", cookieOpt)
                .status(200)
                .send({ ok: true });
        }
    });
    app.get("/api/login/google/callback", async (request, reply) => {
        try {
            const tokenResult = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            const accessToken = tokenResult.token.access_token;
            if (!accessToken) {
                throw new Error("No access token received");
            }
            const resp = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
            if (!resp.ok)
                throw new Error("Failed to fetch user info from Google");
            const profile = (await resp.json());
            const { sub, email, name: userName } = profile;
            const existing = (await getAsync(`SELECT idUser FROM User WHERE oauthSub = ?`, [sub]));
            let userId;
            if (existing) {
                // 이미 가입된 Google 유저
                userId = existing.idUser;
            }
            else {
                const now = new Date().toISOString();
                const userWallet = ethers_1.Wallet.createRandom();
                const address = userWallet.address;
                const privKey = userWallet.privateKey;
                const lastID = (await runAsync(`INSERT INTO User
           (oauthSub, userName, email, registrationDate, address, privkey, connectionStatus)
         VALUES (?, ?, ?, ?, ?, ?, 0)`, [sub, userName, email, now, address, privKey]));
                userId = lastID;
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const [hashedSub, hashedEmail] = await Promise.all([
                bcrypt_1.default.hash(String(sub), salt),
                bcrypt_1.default.hash(email, salt),
            ]);
            const token = app.jwt.sign({
                sub: hashedSub,
                email: hashedEmail,
                userName,
                userId,
            });
            return reply
                .setCookie("token", token, {
                // signed: true,
                httpOnly: true,
                path: "/",
                sameSite: "strict",
                // secure:   true
            })
                .status(303)
                .redirect("/?screen=menu");
        }
        catch (err) {
            app.log.error("Google OAuth error: " + err.message);
            return reply.status(303).redirect("/?screen=login");
        }
    });
}
async function createGame(idp1, idp2, p1score, p2score) {
    // 1) On génère la date au format ISO (meilleur pour SQLite)
    const date = new Date().toISOString();
    // 2) On détermine le gagnant
    const winner = p1score > p2score ? idp1 : idp2;
    // 3) On crée la partie et on récupère son ID
    const gameId = await runAsync(`INSERT INTO Match(matchDate, player1Score, player2Score, winnerId)
     VALUES (?, ?, ?, ?)`, [date, p1score, p2score, winner]);
    // 4) On lie chaque joueur à cette partie
    //    ⚠️ Si tu veux stocker la date dans User_Match, tu peux,
    //    mais ce champ est redondant (tu l’as déjà dans Match.matchDate).
    await runAsync(`INSERT INTO User_Match(userId, matchDate, matchId)
     VALUES (?, ?, ?)`, [idp1, date, gameId]);
    await runAsync(`INSERT INTO User_Match(userId, matchDate, matchId)
     VALUES (?, ?, ?)`, [idp2, date, gameId]);
    return gameId;
}
