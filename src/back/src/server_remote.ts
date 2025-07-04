// src/back/src/server.ts
import crypto from 'crypto';
// …all your existing imports…

// ──────────────────────────────────────────────────────────────────
// MATCHMAKING QUEUE + ACTIVE SESSIONS
// ──────────────────────────────────────────────────────────────────
type Session = {
  id: string;
  game: Game;
  sockets: { p1: WebSocket; p2: WebSocket };
  loopTimer: NodeJS.Timeout;
};
const waiting: Array<{ socket: WebSocket; payload: { sub: number; userName: string } }> = [];
const sessions = new Map<string, Session>();
const socketToSession = new Map<WebSocket, Session>();

// ──────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws
// ──────────────────────────────────────────────────────────────────

// (after app.register(fastifyWebsocket) and your JWT/cookie/userRoutes…)
app.get(
  '/ws',
  {
    websocket: true,
    preHandler: [app.authenticate]
  },
  (connection, request) => {
    const { socket } = connection;
    const payload = request.user as { sub: number; userName: string };

    console.log(`✅ WS client connected: user #${payload.sub}`);

    socket.on('message', async (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }

      switch (msg.type) {
        case 'start':
          // ──────────────────────────────────────────
          // ONLINE VS MATCHMAKING
          // ──────────────────────────────────────────
          if (msg.vs === 'online') {
            // If someone’s already waiting, pair now…
            if (waiting.length > 0) {
              const opponent = waiting.shift()!;
              const gameId = crypto.randomUUID();
              const g = new Game();
              g.mode = 'online';

              // start a single loop for both players
              const timer = setInterval(() => {
                g.update();
                const state = JSON.stringify(g.getState());
                opponent.socket.send(state);
                socket.send(state);
              }, 1000 / 60);

              const session: Session = {
                id: gameId,
                game: g,
                sockets: { p1: opponent.socket, p2: socket },
                loopTimer: timer
              };
              sessions.set(gameId, session);
              socketToSession.set(opponent.socket, session);
              socketToSession.set(socket, session);

              // tell each who they are
              opponent.socket.send(JSON.stringify({ type: 'matchFound', gameId, youAre: 'p1' }));
              socket.send(JSON.stringify({ type: 'matchFound', gameId, youAre: 'p2' }));
            }
            else {
              // no one waiting → enqueue this player
              waiting.push({ socket, payload });
              socket.send(JSON.stringify({ type: 'waiting' }));
            }
            return;
          }

          // ──────────────────────────────────────────
          // LOCAL BOT / PLAYER FLOW (unchanged)
          // ──────────────────────────────────────────
          if (msg.vs === 'bot' || msg.vs === 'player') {
            // … your existing code that sets up game, loopTimer, aiTimer …
          }
          break;

        case 'input':
          // If in an online session, route input there:
          const sess = socketToSession.get(socket);
          if (sess) {
            const who: 'p1' | 'p2' =
              socket === sess.sockets.p1 ? 'p1' : 'p2';
            sess.game.applyInput(who, msg.dir);
            return;
          }
          // else: local flow
          // … your existing local input handler …
          break;

        case 'stop':
          // End an online session, if it exists:
          const s = socketToSession.get(socket);
          if (s) {
            clearInterval(s.loopTimer);
            sessions.delete(s.id);
            socketToSession.delete(s.sockets.p1);
            socketToSession.delete(s.sockets.p2);

            // here you can do your on-chain postScore for both
            // s.game.score contains [p1score, p2score]
            // and then notify both clients:
            s.sockets.p1.send(JSON.stringify({ type: 'matchOver', gameId: s.id, score: s.game.score }));
            s.sockets.p2.send(JSON.stringify({ type: 'matchOver', gameId: s.id, score: s.game.score }));
            return;
          }

          // else: your existing local ‘stop’ logic
          // … postScore to blockchain, clear timers …
          break;

        default:
          socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    });

    socket.on('close', () => {
      // Remove from waiting queue if there
      const idx = waiting.findIndex(w => w.socket === socket);
      if (idx >= 0) waiting.splice(idx, 1);

      // Tear down any live session
      const sess = socketToSession.get(socket);
      if (sess) {
        clearInterval(sess.loopTimer);
        sessions.delete(sess.id);
        socketToSession.delete(sess.sockets.p1);
        socketToSession.delete(sess.sockets.p2);
      }
      console.log('⚠️ WS client disconnected');
    });
  }
);
