import { pongTemplate } from '../templates/pongTemplate.js';
import { waitingTemplate } from '../templates/loadingTemplate.js';
export function renderPong(container, socket, onBack) {
    container.innerHTML = waitingTemplate;
    let isGameActive = false;
    let keyHandlersAdded = false;
    // Single message handler for the entire session
    const messageHandler = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'waiting' && !isGameActive) {
            container.innerHTML = waitingTemplate;
            bindCancel();
        }
        else if (msg.type === 'state') {
            if (!isGameActive) {
                isGameActive = true;
                container.innerHTML = pongTemplate;
                bindGame(msg);
            }
            else {
                // Just update the existing game
                render(msg);
            }
        }
        else if (msg.type === 'STOP') {
            console.log('Game ended:', msg.score1, msg.score2);
            cleanup();
            onBack();
        }
    };
    socket.addEventListener('message', messageHandler);
    let render;
    let onDown;
    let onUp;
    function bindCancel() {
        const back = container.querySelector('#backBtn');
        if (back) {
            back.addEventListener('click', () => {
                cleanup();
                socket.send(JSON.stringify({ type: 'stoplobby' }));
                onBack();
            });
        }
    }
    window.addEventListener('popstate', (event) => {
        cleanup();
    });
    function bindGame(initial) {
        const CW = 500, CH = 300, PW = 10, PH = 60, BR = 6;
        const canvasEl = container.querySelector('#pongCanvas');
        const scoreEl = container.querySelector('#scoreText');
        const backBtn = container.querySelector('#backBtn');
        const quitBtn = container.querySelector('#quit');
        const ctx = canvasEl.getContext('2d', { alpha: true });
        render = (msg) => {
            ctx.clearRect(0, 0, CW, CH);
            ctx.fillStyle = '#00F0FF';
            ctx.fillRect(msg.p1.x, msg.p1.y, PW, PH);
            ctx.fillRect(msg.p2.x, msg.p2.y, PW, PH);
            ctx.beginPath();
            ctx.fillStyle = '#FF00AA';
            ctx.arc(msg.ball.x, msg.ball.y, BR, 0, Math.PI * 2);
            ctx.fill();
            scoreEl.textContent = `${msg.score[0]} - ${msg.score[1]}`;
        };
        // Render initial state
        render(initial);
        if (!keyHandlersAdded) {
            onDown = (e) => {
                if (!isGameActive)
                    return;
                let ply = null, dir = null;
                const k = e.key.toLowerCase();
                if (k === 'w') {
                    ply = 'p1';
                    dir = 'up';
                }
                else if (k === 's') {
                    ply = 'p1';
                    dir = 'down';
                }
                else if (k === 'arrowup') {
                    ply = 'p2';
                    dir = 'up';
                }
                else if (k === 'arrowdown') {
                    ply = 'p2';
                    dir = 'down';
                }
                else if (k === 'escape') {
                    cleanup();
                    onBack();
                    return;
                }
                if (ply && dir) {
                    socket.send(JSON.stringify({ type: 'input', player: ply, dir }));
                }
            };
            onUp = (e) => {
                if (!isGameActive)
                    return;
                let ply = null;
                const k = e.key.toLowerCase();
                if (['w', 's'].includes(k))
                    ply = 'p1';
                else if (['arrowup', 'arrowdown'].includes(k))
                    ply = 'p2';
                if (ply) {
                    socket.send(JSON.stringify({ type: 'input', player: ply, dir: 'stop' }));
                }
            };
            window.addEventListener('keydown', onDown);
            window.addEventListener('keyup', onUp);
            keyHandlersAdded = true;
        }
        backBtn.addEventListener('click', () => { cleanup(); onBack(); });
        quitBtn.addEventListener('click', () => { cleanup(); onBack(); });
    }
    function cleanup() {
        console.log('🧹 Cleaning up pong controller...');
        isGameActive = false;
        // Remove message handler
        socket.removeEventListener('message', messageHandler);
        // Remove key handlers
        if (keyHandlersAdded) {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            keyHandlersAdded = false;
        }
        // Send stop message
        socket.send(JSON.stringify({ type: 'stop' }));
    }
    // Expose cleanup for external use
    renderPong.cleanup = cleanup;
}
//# sourceMappingURL=pongController.js.map