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
 * AI for Pong following strict requirements:
 * - Observes game state exactly once per second (fixed)
 * - Moves smoothly every frame based on last observation
 * - Returns to center when ball moves away (dx < 0)
 * - Predicts intersection when ball approaches (dx > 0)
 * - Difficulty affects prediction accuracy only
 */
export function startAI(game: Game, difficulty: number): ReturnType<typeof setInterval> {
    // Clamp difficulty to [0, 1] range
    const clampedDifficulty = Math.max(0, Math.min(1, difficulty));
    
    // Difficulty-based parameters (much more responsive)
    const PREDICTION_ERROR = lerp(30, 1, clampedDifficulty);      // pixels of prediction error
    const REACTION_TIME = lerp(300, 50, clampedDifficulty);       // ms delay after observation
    const STOPPING_ACCURACY = lerp(4, 1, clampedDifficulty);      // pixels - how precisely AI stops
    const CALCULATION_NOISE = lerp(0.15, 0.02, clampedDifficulty); // random error in calculations
    
    // AI state
    let lastObservation = Date.now();
    let targetY = game.height / 2;
    let targetSetTime = Date.now();
    let isInReactionDelay = false;

    return setInterval(() => {
        const now = Date.now();

        // OBSERVE: Once per second only
        if (now - lastObservation >= 1000) {
            lastObservation = now;
            
            // Take snapshot
            const snapshot = {
                ball: { x: game.ball.x, y: game.ball.y, dx: game.ball.dx, dy: game.ball.dy },
                paddleX: game.p2.x,
                height: game.height
            };

            // CALCULATE: Where to go based on ball direction
            if (snapshot.ball.dx < 0) {
                // Ball moving away - go to center with minimal error
                const centerError = (Math.random() * 2 - 1) * PREDICTION_ERROR * 0.2;
                targetY = snapshot.height / 2 + centerError;
            } else {
                // Ball approaching - predict intersection accurately
                let bx = snapshot.ball.x;
                let by = snapshot.ball.y;
                let vx = snapshot.ball.dx;
                let vy = snapshot.ball.dy;
                
                // Simulate ball movement precisely (high step count for accuracy)
                const simulationSteps = Math.floor(lerp(100, 500, clampedDifficulty));
                let stepCount = 0;
                
                while (bx < snapshot.paddleX && vx > 0 && stepCount < simulationSteps) {
                    bx += vx;
                    by += vy;
                    stepCount++;
                    
                    // Handle bouncing with minimal calculation noise
                    if (by <= 0 || by >= snapshot.height) {
                        vy = -vy;
                        by = Math.max(0, Math.min(snapshot.height, by));
                        
                        // Add small calculation error on bounces
                        const bounceError = (Math.random() * 2 - 1) * CALCULATION_NOISE * 5;
                        by += bounceError;
                        by = Math.max(0, Math.min(snapshot.height, by));
                    }
                }
                
                // Apply final prediction error (much smaller)
                const finalError = (Math.random() * 2 - 1) * PREDICTION_ERROR;
                targetY = by + finalError;
            }
            
            // Clamp target to valid positions
            targetY = Math.max(Game.PADDLE_HEIGHT / 2, 
                     Math.min(snapshot.height - Game.PADDLE_HEIGHT / 2, targetY));
            
            // Start reaction delay
            targetSetTime = now;
            isInReactionDelay = true;
        }

        // MOVE: Every frame - much more responsive
        const paddleCenter = game.p2.y + Game.PADDLE_HEIGHT / 2;
        const delta = targetY - paddleCenter;
        const distance = Math.abs(delta);
        
        // Check if still in reaction delay (much shorter now)
        const timeSinceObservation = now - targetSetTime;
        const hasFinishedReacting = timeSinceObservation > REACTION_TIME;
        
        if (!hasFinishedReacting && isInReactionDelay) {
            // Still reacting - don't move (but much shorter delay)
            game.applyInput('p2', 'stop');
        } else {
            // Move directly to target - no more stop-go behavior
            isInReactionDelay = false;
            
            if (distance < STOPPING_ACCURACY) {
                // Very close - stop
                game.applyInput('p2', 'stop');
            } else if (delta > 0) {
                // Target below - move down
                game.applyInput('p2', 'down');
            } else {
                // Target above - move up
                game.applyInput('p2', 'up');
            }
        }

    }, 1000 / 60);
}

export default class Game {
    static readonly WIDTH = 500;
    static readonly HEIGHT = 300;
    static readonly PADDLE_SPEED = 3;
    static readonly PADDLE_HEIGHT = 60;
    static readonly BALL_ACCEL = 0.3;

    public height = Game.HEIGHT;
    public mode: 'player' | 'bot' | 'online' = 'player';
    public p1: Vec2 = { x: 0, y: (Game.HEIGHT - Game.PADDLE_HEIGHT) / 2 };
    public p2: Vec2 = { x: Game.WIDTH - 10, y: (Game.HEIGHT - Game.PADDLE_HEIGHT) / 2 };
    public ball: Vec2 & { dx: number; dy: number } = {
        x: Game.WIDTH / 2,
        y: Game.HEIGHT / 2,
        dx: 2,
        dy: 1
    };
    public score: [number, number] = [0, 0];
    public maxScore: number = 10; // Target score for ranked games
    public isGameOver: boolean = false;
    public winner: 'p1' | 'p2' | null = null;

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
        if (this.inputs.p1 === 'up') this.p1.y -= Game.PADDLE_SPEED;
        if (this.inputs.p1 === 'down') this.p1.y += Game.PADDLE_SPEED;
        if (this.inputs.p2 === 'up') this.p2.y -= Game.PADDLE_SPEED;
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
            this.checkGameOver();
            this.resetBall();
        }
        if (this.ball.x > Game.WIDTH) {
            this.score[0]++;
            this.checkGameOver();
            this.resetBall();
        }

        // Check for game over
        if (this.score[0] >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'p1';
        }
        if (this.score[1] >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'p2';
        }
    }

    /** Reset the ball to the center with a randomized vertical direction */
    private resetBall(): void {
        this.ball.x = Game.WIDTH / 2;
        this.ball.y = Game.HEIGHT / 2;
        this.ball.dx = this.ball.dx > 0 ? -2 : 2;
        this.ball.dy = Math.random() > 0.5 ? 1 : -1;
    }

    /** Check if game is over based on maxScore */
    private checkGameOver(): void {
        if (this.score[0] >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'p1';
        } else if (this.score[1] >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'p2';
        }
    }

    /** Force a forfeit win for the specified player */
    public forfeit(winner: 'p1' | 'p2'): void {
        this.score = winner === 'p1' ? [this.maxScore, 0] : [0, this.maxScore];
        this.isGameOver = true;
        this.winner = winner;
    }

    /** Set the max score for this game (default 10 for ranked) */
    public setMaxScore(maxScore: number): void {
        this.maxScore = maxScore;
    }

    /** Retrieve the current game state for sending to clients */
    public getState() {
        return {
            type: 'state' as const,
            p1: { ...this.p1 },
            p2: { ...this.p2 },
            ball: { x: this.ball.x, y: this.ball.y },
            score: [...this.score] as [number, number],
            isGameOver: this.isGameOver,
            winner: this.winner
        };
    }
}
