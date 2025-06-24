"use strict";
// src/front/public/src/app.ts
window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (!app)
        throw new Error('No element with id="app" found');
    // --- Constantes pour le canvas ---
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 400;
    const PADDLE_W = 10;
    const PADDLE_H = 80;
    const BALL_R = 8;
    // Eléments du canvas & score (initialisés par initCanvas)
    let canvasEl;
    let ctx;
    let scoreEl;
    // ⚡️ Ouvre la WS sur le même hôte/port que ta page
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.onopen = () => console.log('✅ WebSocket connectée');
    socket.onerror = err => console.error('❌ Erreur WebSocket', err);
    socket.onclose = () => console.log('⚠️ WebSocket fermée');
    // À chaque état reçu du serveur, on dessine
    socket.onmessage = ev => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'state')
            renderState(msg);
    };
    // Initialise canvasEl, ctx et scoreEl après que le DOM ait rendu le canvas
    function initCanvas() {
        canvasEl = document.getElementById('pongCanvas');
        ctx = canvasEl.getContext('2d');
        scoreEl = document.getElementById('scoreText');
    }
    // Dessine l’état reçu du serveur
    function renderState(msg) {
        // Fond noir
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Raquettes
        ctx.fillStyle = '#0f0';
        ctx.fillRect(msg.p1.x, msg.p1.y, PADDLE_W, PADDLE_H);
        ctx.fillRect(msg.p2.x, msg.p2.y, PADDLE_W, PADDLE_H);
        // Balle
        ctx.beginPath();
        ctx.arc(msg.ball.x, msg.ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        // Score
        scoreEl.textContent = `${msg.score[0]} - ${msg.score[1]}`;
    }
    // Écran d’accueil
    function renderHome() {
        app.innerHTML = `
      <h1 class="text-4xl mb-6">🏓 PONG ARCADE</h1>
      <button id="playBtn"
              class="px-6 py-3 border-2 border-accent uppercase text-sm
                     tracking-widest hover:bg-accent hover:text-background
                     transition-all duration-200">
        Play
      </button>
    `;
        document.getElementById('playBtn').addEventListener('click', () => {
            console.log("envoi bien start serv");
            socket.send(JSON.stringify({ type: 'start' }));
            renderPong();
        });
    }
    // Écran de jeu
    function renderPong() {
        app.innerHTML = `
      <div id="scoreboard" class="mb-4 text-white text-2xl text-center font-arcade">
        <span id="scoreText">0 - 0</span>
      </div>
      <canvas id="pongCanvas"
              width="${CANVAS_WIDTH}"
              height="${CANVAS_HEIGHT}"
              class="border-2 border-accent block mx-auto mb-4">
      </canvas>
      <button id="backBtn"
              class="px-4 py-2 border border-white text-sm
                     hover:bg-white hover:text-black transition">
        Back
      </button>
    `;
        initCanvas();
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        document
            .getElementById('backBtn')
            .addEventListener('click', cleanupAndHome);
    }
    // Retour à l’accueil
    function cleanupAndHome() {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        renderHome();
    }
    // Joue pour “Player 1” (W/S) ou “Player 2” (↑/↓)
    function onKeyDown(e) {
        const k = e.key.toLowerCase();
        let player = null;
        let dir = null;
        if (k === 'w') {
            player = 'p1';
            dir = 'up';
        }
        else if (k === 's') {
            player = 'p1';
            dir = 'down';
        }
        else if (k === 'arrowup') {
            player = 'p2';
            dir = 'up';
        }
        else if (k === 'arrowdown') {
            player = 'p2';
            dir = 'down';
        }
        else if (e.key === 'Escape') {
            cleanupAndHome();
            return;
        }
        if (player && dir) {
            socket.send(JSON.stringify({
                type: 'input',
                player,
                dir
            }));
        }
    }
    function onKeyUp(e) {
        const k = e.key.toLowerCase();
        let player = null;
        if (['w', 's'].includes(k)) {
            player = 'p1';
        }
        else if (['arrowup', 'arrowdown'].includes(k)) {
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
    //   // Envoi des inputs au serveur
    //   function onKeyUp(e: KeyboardEvent): void {
    //     let dir: 'up'|'down'|null = null;
    //     let player: "1" | "2" |null = null;
    //     const k = e.key.toLowerCase();
    //     if (k === 'w' || k === 'arrowup')
    //     {
    //             dir = 'up';
    //             if (k === "w")
    //                 player = '1';
    //             else
    //                 player = '2';
    //     }
    //     else if (k === 's' || k === 'arrowdown')
    //     {
    //         dir = 'down';
    //         if (k === "s")
    //                 player = '1';
    //             else
    //                 player = '2';
    //     }
    //     else if (e.key === 'Escape') {
    //       cleanupAndHome();
    //       return;
    //     }
    //     if (dir) socket.send(JSON.stringify({ type: 'input', dir,'player':player}));
    //   }
    //   function onKeyDown(e: KeyboardEvent): void {
    //     const k = e.key.toLowerCase();
    //     let player : "1" | "2" | null = null;
    //     if (['w','s','arrowup','arrowdown'].includes(k)) {
    //         if (['w','s'].includes(k))
    //             player = '1';
    //         else
    //             player = '2';
    //       socket.send(JSON.stringify({ type: 'input', dir: 'stop'}));
    //     }
    //   }
    // ─── Démarrage ───
    renderHome();
});
//# sourceMappingURL=app.js.map