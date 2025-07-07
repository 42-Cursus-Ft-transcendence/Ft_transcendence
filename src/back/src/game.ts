// src/back/src/game.ts

export type Vec2 = { x: number; y: number };

/** Linear interpolation between a and b:
 *  t=0 → returns a
 *  t=1 → returns b
 *  values in between smoothly interpolate.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Super-smooth AI for Pong: always glides toward the predicted ball intersection, even when waiting.
 * Difficulty controls accuracy and approach speed.
 */
export function startAI(game: Game, difficulty: number): ReturnType<typeof setInterval> {
  // Tune these:
  const MIN_SPEED = 0.7;   // slowest pixels per frame
  const MAX_SPEED = 4;     // fastest pixels per frame
  const MAX_NOISE = 48;    // most error at low difficulty
  const MIN_NOISE = 0;     // no error at high difficulty

  // Compute params
  const paddleSpeed = lerp(MIN_SPEED, MAX_SPEED, difficulty);
  const noise = lerp(MAX_NOISE, MIN_NOISE, difficulty);

  return setInterval(() => {
    // Predict where the ball will intersect paddle x
    const { x: bx0, y: by0, dx, dy } = game.ball;
    const paddleX = game.p2.x;
    let targetY: number;

    if (dx > 0) {
      // Simulate ball movement to paddle X
      let bx = bx0, by = by0, vx = dx, vy = dy;
      while (bx < paddleX) {
        bx += vx;
        by += vy;
        if (by < 0 || by > game.height) {
          vy = -vy;
          by = Math.max(0, Math.min(game.height, by));
        }
      }
      targetY = by + (Math.random() * 2 - 1) * noise;
    } else {
      targetY = game.height / 2;
    }

    // Paddle center and desired move
    let paddleCenter = game.p2.y + Game.PADDLE_HEIGHT / 2;
    let delta = targetY - paddleCenter;

    // If very close, land smoothly (don't "snap" or instantly stop)
    if (Math.abs(delta) < paddleSpeed) {
      // Just finish the landing gently
      paddleCenter = targetY;
    } else {
      // Move toward targetY at max paddleSpeed per frame
      paddleCenter += Math.sign(delta) * paddleSpeed;
    }

    // Set new paddle position, clamped to the table
    let newY = paddleCenter - Game.PADDLE_HEIGHT / 2;
    newY = Math.max(0, Math.min(game.height - Game.PADDLE_HEIGHT, newY));
    game.p2.y = newY;
  }, 1000 / 60); // 60 FPS
}

export default class Game {
  static readonly WIDTH  = 600;
  static readonly HEIGHT = 400;
  static readonly PADDLE_SPEED = 4;
  static readonly PADDLE_HEIGHT = 80;
  static readonly BALL_ACCEL = 0.5;

  public height = Game.HEIGHT;
  public mode: 'player' | 'bot' | 'online' = 'player';
  public p1: Vec2 = { x: 0,                y: (Game.HEIGHT - Game.PADDLE_HEIGHT) / 2 };
  public p2: Vec2 = { x: Game.WIDTH - 10, y: (Game.HEIGHT - Game.PADDLE_HEIGHT) / 2 };
  public ball: Vec2 & { dx: number; dy: number } = {
    x: Game.WIDTH / 2,
    y: Game.HEIGHT / 2,
    dx: 2,
    dy: 1
  };
  public score: [number, number] = [0, 0];

  private inputs: { p1: 'up' | 'down' | 'stop'; p2: 'up' | 'down' | 'stop' } = {
    p1: 'stop',
    p2: 'stop'
  };

  /** Apply a direction input ('up', 'down', 'stop') for the given player */
  public applyInput(player: 'p1' | 'p2', dir: 'up' | 'down' | 'stop'): void {
    this.inputs[player] = dir;
  }

  /** Advance the game state by one tick */
  public update(): void {
    // Move paddles
    if (this.inputs.p1 === 'up')   this.p1.y -= Game.PADDLE_SPEED;
    if (this.inputs.p1 === 'down') this.p1.y += Game.PADDLE_SPEED;
    if (this.inputs.p2 === 'up')   this.p2.y -= Game.PADDLE_SPEED;
    if (this.inputs.p2 === 'down') this.p2.y += Game.PADDLE_SPEED;

    // Clamp paddle positions
    this.p1.y = Math.max(0, Math.min(Game.HEIGHT - Game.PADDLE_HEIGHT, this.p1.y));
    this.p2.y = Math.max(0, Math.min(Game.HEIGHT - Game.PADDLE_HEIGHT, this.p2.y));

    // Move ball
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Bounce off top/bottom
    if (this.ball.y < 0 || this.ball.y > Game.HEIGHT) {
      this.ball.dy *= -1;
    }

    // Paddle collisions
    const med1 = this.p1.y + Game.PADDLE_HEIGHT / 2;
    if (
      this.ball.x < this.p1.x + 10 &&
      this.ball.y > this.p1.y &&
      this.ball.y < this.p1.y + Game.PADDLE_HEIGHT &&
      this.ball.dx < 0
    ) {
      this.ball.dx = -this.ball.dx + Game.BALL_ACCEL;
      this.ball.dy = (this.ball.y - med1) / 10;
    }

    const med2 = this.p2.y + Game.PADDLE_HEIGHT / 2;
    if (
      this.ball.x > this.p2.x - 10 &&
      this.ball.y > this.p2.y &&
      this.ball.y < this.p2.y + Game.PADDLE_HEIGHT &&
      this.ball.dx > 0
    ) {
      this.ball.dx = -this.ball.dx - Game.BALL_ACCEL;
      this.ball.dy = (this.ball.y - med2) / 10;
    }

    // Score & reset
    if (this.ball.x < 0) {
      this.score[1]++;
      this.resetBall();
    }
    if (this.ball.x > Game.WIDTH) {
      this.score[0]++;
      this.resetBall();
    }
  }

  /** Reset the ball to the center with a randomized vertical direction */
  private resetBall(): void {
    this.ball.x = Game.WIDTH / 2;
    this.ball.y = Game.HEIGHT / 2;
    this.ball.dx = this.ball.dx > 0 ? -2 : 2;
    this.ball.dy = Math.random() > 0.5 ? 1 : -1;
  }

  /** Retrieve the current game state for sending to clients */
  public getState() {
    return {
      type: 'state' as const,
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      ball: { x: this.ball.x, y: this.ball.y },
      score: [...this.score] as [number, number]
    };
  }
}
