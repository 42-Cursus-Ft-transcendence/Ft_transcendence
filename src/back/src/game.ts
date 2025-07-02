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

/** Starts a simple AI loop that moves paddle p2 toward the predicted ball intercept.
 * @param game The Game instance to control.
 * @param difficulty A number in [0,1], where 0 is easiest and 1 is hardest.
 * @returns The interval timer ID so it can be cleared later.
 */
export function startAI(game: Game, difficulty: number): ReturnType<typeof setInterval> {
  const REACTION_MS    = 1000;                      // AI updates once per second
  const PADDLE_SPEED   = 240;                       // pixels per second
  const MAX_TOLERANCE  = 40;
  const MIN_TOLERANCE  = 4;
  const NOISE_LEVEL    = lerp(20, 0, difficulty);

  const tolerance = lerp(MAX_TOLERANCE, MIN_TOLERANCE, difficulty);
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  return setInterval(() => {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    // Predict where the ball will intersect p2's x
    const { x: bx0, y: by0, dx, dy } = game.ball;
    const paddleX   = game.p2.x;
    const paddleTop = game.p2.y;
    const paddleCtr = paddleTop + Game.PADDLE_HEIGHT / 2;

    let targetY: number;
    if (dx > 0) {
      // Simulate ball movement until it reaches paddleX
      let bx = bx0, by = by0, vx = dx, vy = dy;
      while (bx < paddleX) {
        bx += vx;
        by += vy;
        if (by < 0 || by > game.height) {
          vy = -vy;
          by = Math.max(0, Math.min(game.height, by));
        }
      }
      targetY = by + (Math.random() * 2 - 1) * NOISE_LEVEL;
    } else {
      // Ball moving away: return to center
      targetY = game.height / 2;
    }

    const error    = targetY - paddleCtr;
    const distance = Math.max(0, Math.abs(error) - tolerance);

    if (distance === 0) {
      game.applyInput('p2', 'stop');
    } else {
      const dir = error > 0 ? 'down' : 'up';
      game.applyInput('p2', dir);

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

export default class Game {
  static readonly WIDTH  = 600;
  static readonly HEIGHT = 400;
  static readonly PADDLE_SPEED = 4;
  static readonly PADDLE_HEIGHT = 80;
  static readonly BALL_ACCEL = 0.5;

  public height = Game.HEIGHT;
  public mode: 'player' | 'bot' = 'player';
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
