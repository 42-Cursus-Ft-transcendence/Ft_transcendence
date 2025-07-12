"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// 1) Load .env before anything else reads process.env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const static_1 = __importDefault(require("@fastify/static"));
const ethers_1 = require("ethers");
const blockchain_1 = require("./blockchain");
const game_1 = __importStar(require("./game"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const oauth2_1 = __importDefault(require("@fastify/oauth2"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes")); // ← import par défaut
require("./db/db"); // ← initialise la BD et les tables
const userRoutes_2 = require("./routes/userRoutes");
const crypto_1 = __importDefault(require("crypto"));
// ─────────────────────────────────────────────────────────────────────────────
// Determine frontend directory
// ─────────────────────────────────────────────────────────────────────────────
const prodDir = path_1.default.resolve(__dirname, "../public");
const devDir = path_1.default.resolve(__dirname, "../../../src/front/public");
let publicDir;
if (fs_1.default.existsSync(prodDir)) {
    publicDir = prodDir;
}
else if (fs_1.default.existsSync(devDir)) {
    publicDir = devDir;
}
else {
    console.error("❌ Frontend directory not found");
    process.exit(1);
}
console.log("⛳️ Serving static from:", publicDir);
const waiting = [];
const sessions = new Map();
const socketToSession = new Map();
// ─────────────────────────────────────────────────────────────────────────────
// Create Fastify + register WebSocket plugin
// ─────────────────────────────────────────────────────────────────────────────
const app = (0, fastify_1.default)();
console.log("Fastify instance created");
// cookie
app.register(cookie_1.default, {
    secret: process.env.COOKIE_SECRET || "une_autre_chaine_complexe", // signe/encrypte les cookies
    parseOptions: {},
});
// JWT
app.register(jwt_1.default, {
    secret: process.env.JWT_SECRET || "une_chaine_tres_complexe",
    cookie: {
        cookieName: "token", // le nom exact de ton cookie
        signed: false, // true si tu utilises la signature de fastify-cookie
    },
    sign: {
        expiresIn: "2h",
    },
});
// OAuth2
app.register(oauth2_1.default, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
        client: {
            id: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: oauth2_1.default.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/login/google", // 인증 시작 URL
    callbackUri: process.env.GOOGLE_CALLBACK_URL, // 인증 후 callback URL
    callbackUriParams: {
        // callbackUri에 추가할 custom query 파라미터
        access_type: "offline", // refresh token도 받기 위해 'offline' 모드를 요청
    },
    pkce: "S256",
});
app.decorate("authenticate", async function (request, reply) {
    console.log("Cookies reçus:", request.cookies);
    console.log("Authorization header:", request.headers.authorization);
    try {
        await request.jwtVerify();
    }
    catch (err) {
        reply.send(err);
    }
});
// bd routes
app.register(userRoutes_1.default);
// Register WebSocket plugin without any options
app.register(websocket_1.default);
console.log("WebSocket plugin registered");
// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws (with online matchmaking + bot + local play)
// ─────────────────────────────────────────────────────────────────────────────
app.register(async (fastify) => {
    fastify.get("/ws", {
        websocket: true,
        preHandler: [fastify.authenticate],
    }, (socket, request) => {
        // const { socket } = connection;
        const payload = request.user;
        console.log(`✅ WS client connected: user #${payload.userName}`);
        let localGame = new game_1.default();
        let localLoop;
        let localAI;
        socket.on("message", async (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
                console.log(msg);
            }
            catch {
                return socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
            }
            switch (msg.type) {
                // 1) START: decide online vs bot vs local
                case "start":
                    if (msg.vs === "online") {
                        if (waiting.length > 0) {
                            const opponent = waiting.shift();
                            const p1 = opponent.payload;
                            const p2 = payload;
                            const gameId = crypto_1.default.randomUUID();
                            const sessionGame = new game_1.default();
                            sessionGame.mode = "online";
                            const loopTimer = setInterval(() => {
                                sessionGame.update();
                                const state = JSON.stringify(sessionGame.getState());
                                opponent.socket.send(state);
                                socket.send(state);
                            }, 1000 / 60);
                            const session = {
                                id: gameId,
                                game: sessionGame,
                                sockets: { p1: opponent.socket, p2: socket },
                                players: { p1, p2 },
                                loopTimer,
                            };
                            sessions.set(gameId, session);
                            socketToSession.set(opponent.socket, session);
                            socketToSession.set(socket, session);
                            opponent.socket.send(JSON.stringify({ type: "matchFound", gameId, youAre: "p1" }));
                            socket.send(JSON.stringify({ type: "matchFound", gameId, youAre: "p2" }));
                        }
                        else {
                            waiting.push({ socket, payload });
                            socket.send(JSON.stringify({ type: "waiting" }));
                        }
                        return;
                    }
                    // BOT or LOCAL PLAYER
                    localGame = new game_1.default();
                    localLoop = setInterval(() => {
                        localGame.update();
                        socket.send(JSON.stringify(localGame.getState()));
                    }, 1000 / 60);
                    if (msg.vs === "bot") {
                        localGame.mode = "bot";
                        const diff = parseFloat(msg.difficulty) || 0;
                        localAI = (0, game_1.startAI)(localGame, 1);
                    }
                    return;
                // 2) INPUT: route to the correct game instance
                case "input": {
                    const sess = socketToSession.get(socket);
                    if (sess) {
                        const who = socket === sess.sockets.p1 ? "p1" : "p2";
                        sess.game.applyInput(who, msg.dir);
                        return;
                    }
                    const ply = msg.player === "p2" ? "p2" : "p1";
                    if (ply === "p2" && localGame.mode !== "player")
                        return;
                    localGame.applyInput(ply, msg.dir);
                    return;
                }
                // 3) STOP: tear down the correct session and save scores
                case "stop": {
                    const sess = socketToSession.get(socket);
                    if (sess) {
                        clearInterval(sess.loopTimer);
                        sess.sockets.p1.send(JSON.stringify({
                            type: "STOP",
                            score1: sess.game.score[0],
                            score2: sess.game.score[1],
                        }));
                        sess.sockets.p2.send(JSON.stringify({ type: "STOP" }));
                        sessions.delete(sess.id);
                        socketToSession.delete(sess.sockets.p1);
                        socketToSession.delete(sess.sockets.p2);
                        const row1 = await (0, userRoutes_2.getAsync)(`SELECT address FROM User WHERE idUser = ?`, [sess.players.p1.sub]);
                        const row2 = await (0, userRoutes_2.getAsync)(`SELECT address FROM User WHERE idUser = ?`, [sess.players.p2.sub]);
                        if (!row1 || !row2) {
                            console.error("Missing on-chain address for one of the players");
                        }
                        else {
                            // 3) Post both scores on-chain
                            console.log("blockchain posting");
                            try {
                                const tx1 = await (0, blockchain_1.postScore)(sess.id, row1.address, sess.game.score[0]);
                                const tx2 = await (0, blockchain_1.postScore)(sess.id, row2.address, sess.game.score[1]);
                                console.log("Scores posted:", tx1, tx2);
                            }
                            catch (err) {
                                console.error("postScore failed:", err);
                            }
                        }
                        const result = JSON.stringify({
                            type: "matchOver",
                            gameId: sess.id,
                            score: sess.game.score,
                        });
                        // sess.sockets.p1.send(result);
                        // sess.sockets.p2.send(result);
                        return;
                    }
                    console.log("Game over, saving local scores");
                    if (localLoop) {
                        clearInterval(localLoop);
                        localLoop = undefined;
                    }
                    if (localAI) {
                        clearInterval(localAI);
                        localAI = undefined;
                    }
                    // TODO: post localGame.score on–chain here…
                    return;
                }
                case "stoplobby":
                    {
                        // Rebuild the array without the one you want to drop
                        let item = waiting.findIndex((w) => w.socket === socket);
                        if (item >= 0)
                            waiting.splice(item, 1);
                    }
                    return;
                default:
                    return socket.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
            }
        });
        socket.on("close", () => {
            const idx = waiting.findIndex((w) => w.socket === socket);
            if (idx >= 0)
                waiting.splice(idx, 1);
            const sess = socketToSession.get(socket);
            if (sess) {
                clearInterval(sess.loopTimer);
                sessions.delete(sess.id);
                socketToSession.delete(sess.sockets.p1);
                socketToSession.delete(sess.sockets.p2);
            }
            if (localLoop)
                clearInterval(localLoop);
            if (localAI)
                clearInterval(localAI);
            console.log("⚠️ WS client disconnected");
        });
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// HTTP API: on-chain scores
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/scores", async (req, reply) => {
    try {
        const { gameId, player, score } = req.body;
        if (!gameId || !ethers_1.ethers.isAddress(player) || typeof score !== "number") {
            return reply.status(400).send({ error: "Invalid payload" });
        }
        const txHash = await (0, blockchain_1.postScore)(gameId, player, score);
        reply.send({ txHash });
    }
    catch (err) {
        console.error("POST /api/scores error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
    }
});
app.get("/api/scores/:gameId", async (req, reply) => {
    try {
        const gameId = req.params.gameId;
        console.log(gameId);
        const scores = await (0, blockchain_1.fetchScores)(gameId);
        reply.send(scores);
    }
    catch (err) {
        console.error("GET /api/scores error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Serve static frontend & SPA fallback (excluding /ws & /api)
// ─────────────────────────────────────────────────────────────────────────────
app.register(static_1.default, {
    root: publicDir,
    prefix: "/",
    index: ["index.html"],
    wildcard: false,
});
app.get("/favicon.ico", (_req, reply) => {
    const ico = path_1.default.join(publicDir, "favicon.ico");
    if (fs_1.default.existsSync(ico)) {
        reply.header("Content-Type", "image/x-icon").send(fs_1.default.readFileSync(ico));
    }
    else {
        reply.code(204).send();
    }
});
app.setNotFoundHandler((req, reply) => {
    const url = req.raw.url || "";
    // let /ws handshake and /api pass through
    if (url.startsWith("/ws") || url.startsWith("/api")) {
        return reply.callNotFound();
    }
    reply.sendFile("index.html");
});
// ─────────────────────────────────────────────────────────────────────────────
// SQLite for local logging (optional)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
app
    .listen({ port: PORT, host: "0.0.0.0" })
    .then(() => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`))
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
