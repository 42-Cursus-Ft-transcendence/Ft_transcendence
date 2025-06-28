export function initPongApp() {
    const app = document.getElementById('app');
    if (!app)
        throw new Error('No element with id="app" found');
    // 1) Home screen
    function renderHome() {
        app.innerHTML = `
      <ul class="flex flex-col items-center space-y-4 w-[40%]">
        <li class="w-full"><button id="btn2p" class="threeD-button-set w-full">2 PLAYER</button></li>
        <li class="w-full"><button id="btnIa" class="threeD-button-set w-full">VS IA</button></li>
        <li class="w-full"><button id="btnOnline" class="threeD-button-set w-full">ONLINE</button></li>
        <li class="w-full"><button id="btnProfile" class="threeD-button-set w-full">PROFILE</button></li>
        <li class="w-full"><button id="btnSettings" class="threeD-button-set w-full">SETTINGS</button></li>
      </ul>
    `;
        document.getElementById('btn2p')
            .addEventListener('click', renderPong);
        document.getElementById('btnIa')
            .addEventListener('click', () => renderPlaceholder('VS IA'));
        document.getElementById('btnOnline')
            .addEventListener('click', () => renderPlaceholder('ONLINE'));
        document.getElementById('btnProfile')
            .addEventListener('click', () => renderPlaceholder('PROFILE'));
        document.getElementById('btnSettings')
            .addEventListener('click', () => renderPlaceholder('Settings'));
    }
    // Ecran « placeholder » pour boutons non-implémentés
    function renderPlaceholder(title) {
        app.innerHTML = `
      <div class="text-center">
        <h1 class="font-arcade text-3xl text-accent mb-6">${title}</h1>
        <button id="backBtn" class="threeD-button-set">Back</button>
      </div>
    `;
        document.getElementById('backBtn')
            .addEventListener('click', renderHome);
    }
    // 2) Pong screen
    function renderPong() {
        app.innerHTML = `
    <div>
      <div id="scoreboard" class="mb-4 text-black text-2xl text-center font-arcade">
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
        class="threeD-button-set"
      >Back</button>
    </div>

    `;
        document.getElementById('backBtn')
            .addEventListener('click', cleanupAndHome);
        startPong();
    }
    // 3) Global cleanup & go home
    function cleanupAndHome() {
        // Remove key listeners
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        // Stop animation
        cancelAnimationFrame(animationId);
        // Go back to Home
        renderHome();
    }
    // 4) Variables for key handlers & animation frame
    let animationId = 0;
    function onKeyDown(e) {
        const k = e.key.toLowerCase();
        if (k === 'w')
            paddleLeft.dy = -6;
        else if (k === 's')
            paddleLeft.dy = 6;
        else if (k === 'arrowup')
            paddleRight.dy = -6;
        else if (k === 'arrowdown')
            paddleRight.dy = 6;
        else if (e.key === 'Escape')
            cleanupAndHome();
    }
    function onKeyUp(e) {
        const k = e.key.toLowerCase();
        if (['w', 's'].includes(k))
            paddleLeft.dy = 0;
        if (['arrowup', 'arrowdown'].includes(k))
            paddleRight.dy = 0;
    }
    // 5) Game state objects (declared here so handlers can see them)
    let paddleLeft;
    let paddleRight;
    let ball;
    let playerScoreEl;
    let computerScoreEl;
    // 6) Start Pong
    function startPong() {
        const canvasEl = document.getElementById('pongCanvas');
        if (!canvasEl)
            throw new Error('Canvas not found');
        const ctxEl = canvasEl.getContext('2d');
        if (!ctxEl)
            throw new Error('2D context not available');
        playerScoreEl = document.getElementById('scoreText'); // same element
        computerScoreEl = playerScoreEl; // we’ll update textContent with "p - c"
        // initialize scores & objects
        let playerScore = 0;
        let computerScore = 0;
        const cw = canvasEl.width, ch = canvasEl.height;
        paddleLeft = { x: 0, y: ch / 2 - 40, w: 10, h: 80, dy: 0 };
        paddleRight = { x: cw - 10, y: ch / 2 - 40, w: 10, h: 80, dy: 0 };
        ball = { x: cw / 2, y: ch / 2, r: 8, dx: 2, dy: -1 };
        // attach key listeners
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        // reset ball helper
        function resetBall() {
            ball.x = cw / 2;
            ball.y = ch / 2;
            ball.dx = ball.dx > 0 ? -2 : 2;
            ball.dy = Math.random() > 0.5 ? 1 : -1; // pour éviter un mouvement toujours identique
        }
        // main loop
        function loop() {
            // move paddles
            paddleLeft.y = Math.max(0, Math.min(ch - paddleLeft.h, paddleLeft.y + paddleLeft.dy));
            paddleRight.y = Math.max(0, Math.min(ch - paddleRight.h, paddleRight.y + paddleRight.dy));
            // move ball
            ball.x += ball.dx;
            ball.y += ball.dy;
            // scoring
            if (ball.x < paddleLeft.w) {
                computerScore++;
                playerScoreEl.textContent = `${playerScore} - ${computerScore}`;
                resetBall();
            }
            else if (ball.x > cw - paddleRight.w) {
                playerScore++;
                playerScoreEl.textContent = `${playerScore} - ${computerScore}`;
                resetBall();
            }
            // wall bounce
            if (ball.y < ball.r || ball.y > ch - ball.r)
                ball.dy *= -1;
            // paddle bounce
            if (ball.x - ball.r < paddleLeft.x + paddleLeft.w &&
                ball.y > paddleLeft.y &&
                ball.y < paddleLeft.y + paddleLeft.h &&
                ball.dx < 0) {
                ball.dx -= 0.5;
                ball.dx *= -1;
            }
            if (ball.x + ball.r > paddleRight.x &&
                ball.y > paddleRight.y &&
                ball.y < paddleRight.y + paddleRight.h &&
                ball.dx > 0) {
                ball.dx += 0.1;
                ball.dx *= -1;
            }
            // draw
            ctxEl.fillStyle = '#000';
            ctxEl.fillRect(0, 0, cw, ch);
            ctxEl.fillStyle = '#0f0';
            ctxEl.fillRect(paddleLeft.x, paddleLeft.y, paddleLeft.w, paddleLeft.h);
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
}
//# sourceMappingURL=pong.js.map