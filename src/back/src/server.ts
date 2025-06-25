import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import Fastify from 'fastify'
import FastifyWebSocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import sqlite3 from 'sqlite3'


type Vec2 = { x: number; y: number }

/** Linear interpolation entre a et b 
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
  const REACTION_MS = 1000;  // 1 s
  const TOLERANCE   = lerp(30, 5, difficulty);
  const NOISE       = lerp(20, 0, difficulty);
  const KP          = lerp(0.5, 1.5, difficulty);
  const KD          = lerp(0.1, 0.4, difficulty);

  let lastError = 0;

  return setInterval(() => {
    // 1) Projection de la balle…
    let { x: bx, y: by, dx, dy } = game.ball;
    const targetX = game.p2.x;
    while ((dx > 0 && bx < targetX) || (dx < 0 && bx > targetX)) {
      bx += dx;
      by += dy;
      if (by < 0 || by > 400) dy = -dy;
    }

    // 2) Bruit
    by += (Math.random() * 2 - 1) * NOISE;

    // 3) Erreur
    const paddleCenter = game.p2.y + 80/2;
    const error = by - paddleCenter;
    const derivative = error - lastError;
    lastError = error;

    // 4) Commande PD
    const output = KP * error + KD * derivative;

    // 5) Application
    if (output >  TOLERANCE)      game.applyInput('p2', 'down');
    else if (output < -TOLERANCE) game.applyInput('p2', 'up');
    else                          game.applyInput('p2', 'stop');
  }, REACTION_MS);
}



class Game {
  public mode: 'player' | 'bot' = 'player';
  public p1: Vec2 = { x: 0, y: 160 }
  public p2: Vec2 = { x: 590, y: 160 }
  public ball: Vec2 & { dx: number; dy: number } = { x: 300, y: 200, dx: 2, dy: 1 }
  public score: [number, number] = [0, 0]

  private inputs: { p1: 'up' | 'down' | 'stop'; p2: 'up' | 'down' | 'stop' } = {
    p1: 'stop',
    p2: 'stop'
  }

  public applyInput(player: 'p1' | 'p2', dir: 'up' | 'down' | 'stop') {
    this.inputs[player] = dir
  }

  public update() {
    // const CANVAS_WIDTH  = 600;
    // const CANVAS_HEIGHT = 400;
    // const PADDLE_W      = 10;
    // const BALL_R        = 8;
    const CW = 600, CH = 400
    let med_pad:number;
    const PADDLE_SPEED = 4, PADDLE_H = 80, BALL_INC = 0.5

    // Déplacer les paddles
    if (this.inputs.p1 === 'up') this.p1.y -= PADDLE_SPEED
    if (this.inputs.p1 === 'down') this.p1.y += PADDLE_SPEED
    if (this.inputs.p2 === 'up') this.p2.y -= PADDLE_SPEED
    if (this.inputs.p2 === 'down') this.p2.y += PADDLE_SPEED

    this.p1.y = Math.max(0, Math.min(CH - PADDLE_H, this.p1.y))
    this.p2.y = Math.max(0, Math.min(CH - PADDLE_H, this.p2.y))

    // Déplacer la balle
    this.ball.x += this.ball.dx
    this.ball.y += this.ball.dy
    if (this.ball.y < 0 || this.ball.y > CH)
        this.ball.dy *= -1
    if (
      this.ball.x < this.p1.x + 10 &&
      this.ball.y > this.p1.y &&
      this.ball.y < this.p1.y + PADDLE_H &&
      this.ball.dx < 0
    ) {
      this.ball.dx = -this.ball.dx + BALL_INC
      med_pad = this.p1.y + PADDLE_H/2;
      this.ball.dy = (this.ball.y - med_pad) / 10;
    }
    if (
      this.ball.x > this.p2.x - 10 &&
      this.ball.y > this.p2.y &&
      this.ball.y < this.p2.y + PADDLE_H &&
      this.ball.dx > 0
    ) {
      this.ball.dx = -this.ball.dx - BALL_INC
      med_pad = this.p2.y + PADDLE_H/2;
      this.ball.dy = (this.ball.y - med_pad) / 10;
    }

    if (this.ball.x < 0) {
      this.score[1]++
      this.resetBall()
    }
    if (this.ball.x > CW) {
      this.score[0]++
      this.resetBall()
    }
  }
  private resetBall() {
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
if (fs.existsSync(prodDir)) publicDir = prodDir
else if (fs.existsSync(devDir)) publicDir = devDir
else { console.error(' ❌ Frontend introuvable'); process.exit(1) }
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


const game = new Game()
let timer: ReturnType<typeof setInterval>
let aiTimer: ReturnType<typeof setInterval>  // ← for the bot

socket.on('message', (raw: Buffer) => {
  const msg = JSON.parse(raw.toString())

  if (msg.type === 'start' && !timer) {
    // always start the main game loop
    if (msg.vs === 'bot')
        game.mode = 'bot';
    timer = setInterval(() => {
      game.update()
      socket.send(JSON.stringify(game.getState()))
    }, 1000 / 60)
    if (msg.vs === 'bot') {
        aiTimer = startAI(game, msg.difficulty ?? 1);
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
})

socket.on('close', () => {
  clearInterval(timer)
  clearInterval(aiTimer)
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
