import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import Fastify from 'fastify'
import FastifyWebSocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import sqlite3 from 'sqlite3'


type Vec2 = { x: number; y: number }

/** lerp  = Linear interpolation entre a et b 
 * pour lisser l approche du paddle vers la position dirigee
 * a etant le point de depart b le point a atteindre
 * et t l indice de souplesse : 
 * quand t tend vers 0 -> peu de movement 
 * quand t tend vers 1 -> tres proche de la difference actuelle => pas de lissage 
*/
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function startAI(game: Game, difficulty: number) {
  // === CONFIGURATION ===
  const REACTION_MS    = 1000;                      // how often we “see” & decide
  const PADDLE_SPEED   = 240;                       // pixels per second; tune to match game
  const MAX_TOLERANCE  = 40;                        // loose at diff=0
  const MIN_TOLERANCE  = 4;                         // tight at diff=1
  const NOISE_LEVEL    = lerp(20, 0, difficulty);   // ±noise at low diff
  // ======================

  const tolerance = lerp(MAX_TOLERANCE, MIN_TOLERANCE, difficulty);
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  return setInterval(() => {
    // 1) Cancel any previously-scheduled stop so we can re-plan
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    // 2) Compute intercept (or center) as before
    const { x: bx0, y: by0, dx, dy } = game.ball;
    const paddleX     = game.p2.x;
    const paddleTop   = game.p2.y;
    const paddleCtr   = paddleTop + 80/2;  // paddle height = 80
    let targetY: number;

    if (dx > 0) {
      // ball coming at us → project bounces until bx >= paddleX
      let bx = bx0, by = by0, vx = dx, vy = dy;
      while (bx < paddleX) {
        bx += vx; by += vy;
        if (by < 0 || by > game.height) {
          vy = -vy;
          by = Math.max(0, Math.min(game.height, by));
        }
      }
      targetY = by + (Math.random()*2 - 1)*NOISE_LEVEL;
    } else {
      // ball moving away → return to center
      targetY = game.height/2;
    }

    // 3) Figure out how much we need to move (beyond tolerance)
    const error    = targetY - paddleCtr;
    const distance = Math.max(0, Math.abs(error) - tolerance);

    if (distance === 0) {
      // within tolerance → don’t move
      game.applyInput('p2', 'stop');

    } else {
      // which direction?
      const dir = error > 0 ? 'down' : 'up';
      game.applyInput('p2', dir);

      // 4) schedule a stop after exactly enough time to cover `distance`
      //    time (ms) = dist (px) / speed (px/sec) * 1000
      const moveTime = Math.min(
        Math.round(distance / PADDLE_SPEED * 1000),
        REACTION_MS
      );

      stopTimer = setTimeout(() => {
        game.applyInput('p2', 'stop');
      }, moveTime);
    }

  }, REACTION_MS);
}







class Game {
    public height: number = 400;
    public mode: 'player' | 'bot' = 'player';
    public p1: Vec2 = { x: 0, y: 160 };
    public p2: Vec2 = { x: 590, y: 160 };
    public ball: Vec2 & { dx: number; dy: number } = { x: 300, y: 200, dx: 2, dy: 1 };
    public score: [number, number] = [0, 0];

    private inputs: { p1: 'up' | 'down' | 'stop'; p2: 'up' | 'down' | 'stop' } = {
        p1: 'stop', p2: 'stop'};

    public applyInput(player: 'p1' | 'p2', dir: 'up' | 'down' | 'stop') {
        this.inputs[player] = dir};

    public update() {
        const CW = 600, CH = 400
        let med_pad:number;
        const PADDLE_SPEED = 4, PADDLE_H = 80, BALL_INC = 0.5

    // Déplacer les paddles
        if (this.inputs.p1 === 'up')
            this.p1.y -= PADDLE_SPEED
        if (this.inputs.p1 === 'down')
            this.p1.y += PADDLE_SPEED
        if (this.inputs.p2 === 'up')
            this.p2.y -= PADDLE_SPEED
        if (this.inputs.p2 === 'down')
            this.p2.y += PADDLE_SPEED

        this.p1.y = Math.max(0, Math.min(CH - PADDLE_H, this.p1.y));
        this.p2.y = Math.max(0, Math.min(CH - PADDLE_H, this.p2.y));
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        if (this.ball.y < 0 || this.ball.y > CH)
            this.ball.dy *= -1
        if (this.ball.x < this.p1.x + 10 &&
                this.ball.y > this.p1.y &&
                    this.ball.y < this.p1.y + PADDLE_H &&
                        this.ball.dx < 0)
        {
            this.ball.dx = -this.ball.dx + BALL_INC;
            med_pad = this.p1.y + PADDLE_H/2;
            this.ball.dy = (this.ball.y - med_pad) / 10;
        }
        if (this.ball.x > this.p2.x - 10 &&
                this.ball.y > this.p2.y &&
                    this.ball.y < this.p2.y + PADDLE_H &&
                        this.ball.dx > 0)
        {
            this.ball.dx = -this.ball.dx - BALL_INC
            med_pad = this.p2.y + PADDLE_H/2;
            this.ball.dy = (this.ball.y - med_pad) / 10;
        }
        if (this.ball.x < 0)
        {
        this.score[1]++
        this.resetBall()
        }
        if (this.ball.x > CW)
        {
        this.score[0]++
        this.resetBall()
        }
  }
    private resetBall()
    {
        this.ball.x = 300
        this.ball.y = 200
        this.ball.dx = this.ball.dx > 0 ? -2:2;
        //math.random renvoie un nombre entre 0 et 1
        this.ball.dy = Math.random() > 0.5 ? 1 : -1
    }

    public getState() {
        return { type: 'state', p1: this.p1, p2: this.p2, ball: { x: this.ball.x, y: this.ball.y }, score: this.score }
    }
}

// Charger le .env dans bon
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Déterminer le dossier public
const prodDir = path.resolve(__dirname, '../public')
const devDir  = path.resolve(__dirname, '../../../src/front/public')
let publicDir: string
if (fs.existsSync(prodDir))
    publicDir = prodDir
else if (fs.existsSync(devDir))
    publicDir = devDir
else
    { console.error(' ❌ Frontend introuvable'); process.exit(1) }
console.log('⛳️ Serving static from:', publicDir)

// Créer et configurer Fastify
const app = Fastify()
console.log('Fastify instance created')

// Enregistrer WebSocket
app.register(FastifyWebSocket)
console.log('WebSocket plugin registered')

// Route WS pour Pong
app.register(async fastify => {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
    // const { socket } = connection
    console.log('WS client connected')

let game = new Game()
let timer: ReturnType<typeof setInterval> | undefined = undefined
let aiTimer: ReturnType<typeof setInterval> | undefined = undefined


socket.on('message', (raw: Buffer) => {
  const msg = JSON.parse(raw.toString())

  if (msg.type === 'start' && !timer) {
    // always start the main game loop
    game = new Game();
    if (msg.vs === 'bot')
        game.mode = 'bot';
    timer = setInterval(() => {
      game.update()
      socket.send(JSON.stringify(game.getState()))
    }, 1000 / 60)
    if (msg.vs === 'bot') {
        let diff:number;
        diff = parseFloat(msg.difficulty);
        aiTimer = startAI(game, diff);
    }
  }
  else if (msg.type === 'input') {
    // human player input
    const ply = msg.player === 'p2' ? 'p2' : 'p1'
    if (ply === 'p2' && game.mode !== 'player') {
      return;
    }
    game.applyInput(ply, msg.dir)
  }
  else if (msg.type === 'stop')
  {
    //!\ creer une fonction pour retourner  de 
    //!\ le score a la db
    console.log("bien termine game");
    if (timer)
    {
        clearInterval(timer);
        timer = undefined;
    }
    if (aiTimer)
    {
        clearInterval(aiTimer);
        aiTimer = undefined;
    }
  }
})

socket.on('close', () => {
    if (timer)
    {
        clearInterval(timer);
        timer = undefined;
    }
    if (aiTimer)
    {
        clearInterval(aiTimer);
        aiTimer = undefined;
    }
  console.log('WS client disconnected')
})
})
})

// Servir le front
app.register(fastifyStatic, { root: publicDir, prefix: '/', index: ['index.html'], wildcard: true })

// Favicon bugge gingembre
app.get('/favicon.ico', (_req, reply) => {
  const ico = path.join(publicDir, 'favicon.ico')
  if (fs.existsSync(ico)) reply.header('Content-Type','image/x-icon').send(fs.readFileSync(ico))
  else reply.code(204).send()
})

// SPA fallback: le truc renvoye par defaut vu qu on sert que le index.html
app.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'))

// SQLite scores setup
const dbPath = path.resolve(__dirname, process.env.DB_PATH || '../data/db.sqlite')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
const db = new sqlite3.Database(dbPath, err => err ? console.error(err) : console.log('✅ SQLite ready'))
db.run(`CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, player TEXT, score INTEGER, date DATETIME DEFAULT CURRENT_TIMESTAMP)`)  


// serveur en ligne omg
app.listen({ port: 3000, host: '0.0.0.0' }, err => err ? (console.error(err), process.exit(1)) : console.log('🚀 Server running at http://0.0.0.0:3000'))
