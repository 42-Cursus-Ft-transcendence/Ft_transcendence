import { pongTemplate } from '../templates/pongTemplate.js';

export function renderPong(container: HTMLElement, socket: WebSocket,  onBack: () => void): void
{
    container.innerHTML = pongTemplate;

    // Game state objects (declared here so handlers can see them)
  const CANVAS_WIDTH  = 600;
  const CANVAS_HEIGHT = 400;
  const PADDLE_W      = 10;
  const PADDLE_H      = 80;
  const BALL_R        = 8;

  const canvasEl = container.querySelector<HTMLCanvasElement>('#pongCanvas')!;
  const scoreText = container.querySelector<HTMLElement>('#scoreText')!;
  const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
  const ctx = canvasEl.getContext('2d', { alpha: true })!;
;

  // À chaque état reçu du serveur, on dessine
  socket.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'state') renderState(msg);
  };

  function renderState(msg: {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    ball: { x: number; y: number };
    score: [number, number];
  }): void {
    // Fond noir
    // ctx.fillStyle = '#000';
    // ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // paddle
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(msg.p1.x, msg.p1.y, PADDLE_W, PADDLE_H);
    ctx.fillRect(msg.p2.x, msg.p2.y, PADDLE_W, PADDLE_H);

    // Balle
    ctx.beginPath();
    ctx.fillStyle = '#FF00AA';
    ctx.arc(msg.ball.x, msg.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Score
    scoreText.textContent = `${msg.score[0]} - ${msg.score[1]}`;
  }

  // Global cleanup 
  function cleanup(): void {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    socket.send(JSON.stringify({ 'type': 'stop' }));
  }

  window.addEventListener('popstate', (event) => {
    cleanup();
  });

  function onKeyDown(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  let player: 'p1' | 'p2' | null = null;
  let dir: 'up' | 'down' | null = null;

  if (k === 'w') {
    player = 'p1'; dir = 'up';
  } else if (k === 's') {
    player = 'p1'; dir = 'down';
  } else if (k === 'arrowup') {
    player = 'p2'; dir = 'up';
  } else if (k === 'arrowdown') {
    player = 'p2'; dir = 'down';
  } else if (e.key === 'Escape') {
    cleanup();
    onBack();
  }

  if (player && dir) {
    socket.send(JSON.stringify({
      type: 'input',
      player,
      dir
    }));
  }
}

function onKeyUp(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  let player: 'p1' | 'p2' | null = null;

  if (['w','s'].includes(k)) {
    player = 'p1';
  } else if (['arrowup','arrowdown'].includes(k)) {
    player = 'p2';
  }

  if (player) {
    // “stop” pour arrêter le mouvement de la raquette de ce joueur
    socket.send(JSON.stringify({
      type: 'input',
      player,
      dir: 'stop'
    }));
  }
}
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);
  backBtn.addEventListener('click', () => {
    cleanup();
    onBack();
  });
}
