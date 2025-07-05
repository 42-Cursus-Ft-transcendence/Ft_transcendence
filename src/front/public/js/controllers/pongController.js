import { pongTemplate } from '../templates/pongTemplate.js';
import { waitingTemplate } from '../templates/loadingTemplate.js';
export function renderPong(container, socket, onBack) {
    container.innerHTML = waitingTemplate;
    socket.onmessage = ev => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'waiting') {
            container.innerHTML = waitingTemplate;
            bindCancel();
        }
        else if (msg.type === 'state') {
            container.innerHTML = pongTemplate;
            bindGame(msg);
        }
    };
    function bindCancel() {
        const back = container.querySelector('#backBtn');
        back.addEventListener('click', () => {
            socket.send(JSON.stringify({ type: 'stoploby' }));
            onBack();
        });
    }
    function bindGame(initial) {
        const CW = 600, CH = 400, PW = 10, PH = 80, BR = 8;
        const canvasEl = container.querySelector('#pongCanvas');
        const scoreEl = container.querySelector('#scoreText');
        const backBtn = container.querySelector('#backBtn');
        const quitBtn = container.querySelector('#quit');
        const ctx = canvasEl.getContext('2d', { alpha: true });
        render(initial);
        socket.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'state')
                render(msg);
        };
        const onDown = (e) => {
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
            }
            if (ply && dir)
                socket.send(JSON.stringify({ type: 'input', player: ply, dir }));
        };
        const onUp = (e) => {
            let ply = null;
            const k = e.key.toLowerCase();
            if (['w', 's'].includes(k))
                ply = 'p1';
            else if (['arrowup', 'arrowdown'].includes(k))
                ply = 'p2';
            if (ply)
                socket.send(JSON.stringify({ type: 'input', player: ply, dir: 'stop' }));
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        backBtn.addEventListener('click', () => { cleanup(); onBack(); });
        quitBtn.addEventListener('click', () => { cleanup(); onBack(); });
        function render(msg) {
            ctx.clearRect(0, 0, CW, CH);
            ctx.fillStyle = '#00F0FF';
            ctx.fillRect(msg.p1.x, msg.p1.y, PW, PH);
            ctx.fillRect(msg.p2.x, msg.p2.y, PW, PH);
            ctx.beginPath();
            ctx.fillStyle = '#FF00AA';
            ctx.arc(msg.ball.x, msg.ball.y, BR, 0, Math.PI * 2);
            ctx.fill();
            scoreEl.textContent = `${msg.score[0]} - ${msg.score[1]}`;
        }
        function cleanup() {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            socket.send(JSON.stringify({ type: 'stop' }));
        }
    }
}
//# sourceMappingURL=pongController.js.map