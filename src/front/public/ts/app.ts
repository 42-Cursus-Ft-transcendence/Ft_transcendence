// src/front/public/src/app.ts

window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app')!;
  if (!app) throw new Error('No element with id="app" found');

  interface Paddle { x: number; y: number; w: number; h: number; dy: number }
  interface Ball   { x: number; y: number; r: number; dx: number; dy: number }

  // 1) Home screen
  function renderHome(): void {
    app.innerHTML = `
      <h1 class="text-4xl mb-6">🏓 PONG ARCADE</h1>
      <button
        id="playBtn"
        class="px-6 py-3 border-2 border-accent uppercase text-sm tracking-widest
               hover:bg-accent hover:text-background transition-all duration-200"
      >Play</button>
    `;
    document.getElementById('playBtn')!
      .addEventListener('click', renderPong);
  }

  // 2) Pong screen
  function renderPong(): void {
    app.innerHTML = `
      <div id="scoreboard" class="mb-4 text-white text-2xl text-center font-arcade">
        <span id="scoreText">0 - 0</span>
      </div>
      <canvas
        id="pongCanvas"
        width="600"
        height="400"
        class="border-2 border-accent block mx-auto mb-4"
      ></canvas>
      <button
        id="backBtn"
        class="px-4 py-2 border border-white text-sm
               hover:bg-white hover:text-black transition"
      >Back</button>
    `;
    document.getElementById('backBtn')!
      .addEventListener('click', cleanupAndHome);

    startPong();
  }

  // 3) Global cleanup & go home
  function cleanupAndHome(): void {
    // Remove key listeners
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    // Stop animation
    cancelAnimationFrame(animationId);
    // Go back to Home
    renderHome();
  }

  // 4) Variables for key handlers & animation frame
  let animationId = 0;
  function onKeyDown(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (k === 'w')      paddleLeft.dy  = -6;
    else if (k === 's') paddleLeft.dy  =  6;
    else if (k === 'arrowup')   paddleRight.dy = -6;
    else if (k === 'arrowdown') paddleRight.dy =  6;
    else if (e.key === 'Escape') cleanupAndHome();
  }
  function onKeyUp(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (['w','s'].includes(k))               paddleLeft.dy  = 0;
    if (['arrowup','arrowdown'].includes(k)) paddleRight.dy = 0;
  }

  // 5) Game state objects (declared here so handlers can see them)
  let paddleLeft: Paddle;
  let paddleRight: Paddle;
  let ball: Ball;
  let playerScoreEl: HTMLElement;
  let computerScoreEl: HTMLElement;

  // 6) Start Pong
  function startPong(): void {
    const canvasEl = document.getElementById('pongCanvas') as HTMLCanvasElement | null;
    if (!canvasEl) throw new Error('Canvas not found');
    const ctxEl = canvasEl.getContext('2d')!;
    if (!ctxEl) throw new Error('2D context not available');

    playerScoreEl   = document.getElementById('scoreText')!; // same element
    computerScoreEl = playerScoreEl; // we’ll update textContent with "p - c"

    // initialize scores & objects
    let playerScore = 0;
    let computerScore = 0;
    const cw = canvasEl.width, ch = canvasEl.height;
    paddleLeft  = { x: 0,       y: ch/2 - 40, w: 10, h: 80, dy: 0 };
    paddleRight = { x: cw - 10,  y: ch/2 - 40, w: 10, h: 80, dy: 0 };
    ball        = { x: cw/2,     y: ch/2,      r: 8, dx: 2, dy: -1 };

    // attach key listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // reset ball helper
    function resetBall(): void {
      ball.x  = cw/2;
      ball.y  = ch/2;
      ball.dx = Math.random() > 0.5 ? 2 : -2; // pour varier la direction
      ball.dy = Math.random() > 0.5 ? 1 : -1; // pour éviter un mouvement toujours identique
    }

    // main loop
    function loop(): void {
      // move paddles
      paddleLeft.y  = Math.max(0, Math.min(ch - paddleLeft.h,  paddleLeft.y  + paddleLeft.dy));
      paddleRight.y = Math.max(0, Math.min(ch - paddleRight.h, paddleRight.y + paddleRight.dy));
      // move ball
      ball.x += ball.dx;
      ball.y += ball.dy;
      // scoring
      if (ball.x  < paddleLeft.w) {
        computerScore++;
        playerScoreEl.textContent = `${playerScore} - ${computerScore}`;
        resetBall();
      } else if (ball.x  > cw - paddleRight.w) {
        playerScore++;
        playerScoreEl.textContent = `${playerScore} - ${computerScore}`;
        resetBall();
      }
      // wall bounce
      if (ball.y < ball.r || ball.y > ch - ball.r) ball.dy *= -1;
      // paddle bounce
      if (
        ball.x - ball.r < paddleLeft.x + paddleLeft.w &&
        ball.y > paddleLeft.y &&
        ball.y < paddleLeft.y + paddleLeft.h &&
        ball.dx < 0
      )
      {
        ball.dx -= 0.5;
        ball.dx *= -1;
      }
      if (
        ball.x + ball.r > paddleRight.x &&
        ball.y > paddleRight.y &&
        ball.y < paddleRight.y + paddleRight.h &&
        ball.dx > 0)
      {
        ball.dx += 0.1
        ball.dx *= -1;
      }


      // draw
      ctxEl.fillStyle = '#000';
      ctxEl.fillRect(0, 0, cw, ch);
      ctxEl.fillStyle = '#0f0';
      ctxEl.fillRect(paddleLeft.x,  paddleLeft.y,  paddleLeft.w,  paddleLeft.h);
      ctxEl.fillRect(paddleRight.x, paddleRight.y, paddleRight.w, paddleRight.h);
      ctxEl.beginPath();
      ctxEl.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctxEl.fill();

      animationId = requestAnimationFrame(loop);
    }

    loop();
  }

  // kick off
  renderHome();
});
