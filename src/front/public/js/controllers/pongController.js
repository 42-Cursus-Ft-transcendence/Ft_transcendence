import { pongTemplate } from '../templates/pongTemplate.js';
import { waitingTemplate } from '../templates/loadingTemplate.js';
import { notificationTemplate } from '../templates/notificationTemplate.js';
import { loadGameplaySettings } from './settingsController.js';
export function renderPong(container, socket, onBack) {
    container.innerHTML = waitingTemplate;
    const settings = loadGameplaySettings();
    let isGameActive = false;
    let keyHandlersAdded = false;
    // Store player names for display
    let player1Name = "P1";
    let player2Name = "P2";
    // Function to show notification with callback
    function showNotification(message, callback) {
        // Add notification modal to container if not already present
        if (!container.querySelector('#notification-modal')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notificationTemplate;
            container.appendChild(tempDiv.firstElementChild);
        }
        const modal = container.querySelector('#notification-modal');
        const content = container.querySelector('#notification-content');
        const okBtn = container.querySelector('#notification-ok');
        const closeBtn = container.querySelector('#notification-close');
        // Convert message to HTML with proper formatting
        const formattedMessage = message.replace(/\n/g, '<br>');
        content.innerHTML = formattedMessage;
        modal.classList.remove('hidden');
        const handleClose = () => {
            modal.classList.add('hidden');
            if (callback)
                callback();
        };
        // Remove existing listeners to avoid duplicates
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newOkBtn.addEventListener('click', handleClose);
        newCloseBtn.addEventListener('click', handleClose);
    }
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
                // Force update labels immediately after template is set
                // Use both setTimeout and immediate call to ensure labels are updated
                updatePlayerLabels();
                setTimeout(() => {
                    updatePlayerLabels();
                }, 0);
                bindGame(msg);
            }
            else {
                // Just update the existing game
                render(msg);
            }
        }
        else if (msg.type === 'STOP') {
            console.log('Game ended:', msg.score1, msg.score2);
            // Determine winner and create message
            const score1 = msg.score1 || 0;
            const score2 = msg.score2 || 0;
            const winner = score1 > score2 ? player1Name : player2Name;
            const message = `<div style="text-align: center;"><strong>Game Over!</strong><br><br><span style="color: #00ff00;">${winner}</span> wins!<br><br>Score: <span style="color: #00ffff;">${score1} - ${score2}</span></div>`;
            showNotification(message, () => {
                cleanup();
                onBack();
            });
        }
        else if (msg.type === 'matchOver') {
            console.log('Match ended:', msg);
            let message = '';
            if (msg.message) {
                message = `<div style="text-align: center;"><strong>Match Ended</strong><br><br>${msg.message}</div>`;
            }
            else {
                // Fallback message if no specific message provided
                message = '<div style="text-align: center;"><strong>Match Ended</strong></div>';
            }
            showNotification(message, () => {
                cleanup();
                onBack();
            });
        }
        else if (msg.type === 'rankedMatchOver') {
            console.log('Ranked match ended:', msg);
            let message = '<div style="text-align: center;"><strong>Ranked Match Over!</strong><br><br>';
            // Add match result
            if (msg.winner) {
                const winnerName = msg.winner === 'p1' ? player1Name : player2Name;
                message += `🥇 <span style="color: #00ff00;">${winnerName}</span> wins!<br><br>`;
            }
            // Add score if available
            if (msg.score) {
                message += `Score: <span style="color: #00ffff;">${msg.score[0]} - ${msg.score[1]}</span><br><br>`;
            }
            // Add ELO changes
            if (msg.eloChanges) {
                const p1Change = msg.eloChanges.p1.eloChange;
                const p2Change = msg.eloChanges.p2.eloChange;
                message += `<strong>ELO Changes:</strong><br>`;
                message += `<span style="color: ${p1Change >= 0 ? '#00ff00' : '#ff4444'};">${player1Name}: ${p1Change > 0 ? '+' : ''}${p1Change}</span><br>`;
                message += `<span style="color: ${p2Change >= 0 ? '#00ff00' : '#ff4444'};">${player2Name}: ${p2Change > 0 ? '+' : ''}${p2Change}</span>`;
            }
            message += '</div>';
            showNotification(message, () => {
                cleanup();
                onBack();
            });
        }
        else if (msg.type === "rankedMatchFound") {
            console.log('🏆 Ranked match found message received:', msg);
            const yourP = msg.youAre;
            const yourName = msg.yourName;
            const opponent = msg.opponent;
            console.log('🏷️ Setting ranked player names:', {
                yourP,
                yourName,
                opponentName: opponent.userName
            });
            // Set player names based on position
            if (yourP === "p1") {
                player1Name = yourName;
                player2Name = opponent.userName;
            }
            else {
                player1Name = opponent.userName;
                player2Name = yourName;
            }
            console.log('🏷️ Final ranked player names set:', {
                player1Name,
                player2Name,
                isGameActive
            });
            // Always try to update labels - if DOM isn't ready, the setTimeout in state handler will catch it
            updatePlayerLabels();
        }
        else if (msg.type === "matchFound") {
            console.log('🎮 matchFound message received:', msg);
            const yourP = msg.youAre;
            console.log('Online match found, you are:', yourP, 'your name:', msg.yourName, 'opponent:', msg.opponent?.userName);
            // If player names are included
            if (msg.yourName && msg.opponent && msg.opponent.userName) {
                console.log('🏷️ Setting online player names:', {
                    yourP,
                    yourName: msg.yourName,
                    opponentName: msg.opponent.userName
                });
                if (yourP === "p1") {
                    player1Name = msg.yourName;
                    player2Name = msg.opponent.userName;
                }
                else {
                    player1Name = msg.opponent.userName;
                    player2Name = msg.yourName;
                }
                console.log('🏷️ Final online player names set:', {
                    player1Name,
                    player2Name,
                    isGameActive
                });
                // Always try to update labels - if DOM isn't ready, the setTimeout in state handler will catch it
                updatePlayerLabels();
            }
            else {
                console.log('❌ Missing player names in matchFound message:', {
                    yourName: msg.yourName,
                    opponent: msg.opponent,
                    opponentUserName: msg.opponent?.userName
                });
            }
        }
    };
    // Function to update player labels
    function updatePlayerLabels() {
        console.log('🏷️ updatePlayerLabels called with:', { player1Name, player2Name, isGameActive });
        const player1Label = container.querySelector('#player1Label');
        const player2Label = container.querySelector('#player2Label');
        console.log('🏷️ Found label elements:', {
            player1Label: !!player1Label,
            player2Label: !!player2Label,
            containerHTML: container.innerHTML.includes('player1Label')
        });
        if (player1Label) {
            player1Label.textContent = player1Name;
            console.log('🏷️ Set player1Label to:', player1Name);
        }
        else {
            console.log('❌ player1Label element not found');
        }
        if (player2Label) {
            player2Label.textContent = player2Name;
            console.log('🏷️ Set player2Label to:', player2Name);
        }
        else {
            console.log('❌ player2Label element not found');
        }
    }
    socket.addEventListener('message', messageHandler);
    let render;
    let onDown;
    let onUp;
    function bindCancel() {
        const back = container.querySelector('#backBtn');
        if (back) {
            back.addEventListener('click', () => {
                socket.send(JSON.stringify({ type: 'stoplobby' }));
                cleanup();
                onBack();
            });
        }
    }
    // Bind cancel button immediately since we start with waitingTemplate
    bindCancel();
    window.addEventListener('popstate', (event) => {
        if (isGameActive) {
            socket.send(JSON.stringify({ type: 'forfeit' }));
        }
        cleanup();
    });
    // Handle page refresh/close during active game
    const handleBeforeUnload = (event) => {
        if (isGameActive) {
            socket.send(JSON.stringify({ type: 'forfeit' }));
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    function bindGame(initial) {
        const CW = 500, CH = 300, PW = 10, PH = 60, BR = 6;
        const canvasEl = container.querySelector('#pongCanvas');
        const scoreEl = container.querySelector('#scoreText');
        const backBtn = container.querySelector('#backBtn');
        const quitBtn = container.querySelector('#quit');
        const ctx = canvasEl.getContext('2d', { alpha: true });
        const ballHistory = [];
        const { r, g, b } = hexToRgb(settings.bgColor);
        const a = settings.bgOpacity / 100;
        canvasEl.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
        if (settings.glowIntensity) {
            ctx.shadowBlur = settings.glowIntensity;
            ctx.shadowColor = settings.ballColor;
        }
        render = (msg) => {
            ballHistory.unshift({ x: msg.ball.x, y: msg.ball.y });
            if (ballHistory.length > settings.trailLength) {
                ballHistory.pop();
            }
            ctx.clearRect(0, 0, CW, CH);
            ctx.fillStyle = settings.paddleColor;
            ctx.fillRect(msg.p1.x, msg.p1.y, PW, PH);
            ctx.fillRect(msg.p2.x, msg.p2.y, PW, PH);
            // ball trail
            if (settings.trailLength > 0) {
                ballHistory.forEach((pos, idx) => {
                    const alpha = 1 - idx / settings.trailLength;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, BR, 0, Math.PI * 2);
                    ctx.fillStyle = settings.ballColor;
                    ctx.fill();
                });
                ctx.globalAlpha = 1;
            }
            ctx.beginPath();
            ctx.fillStyle = settings.ballColor;
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
                if (k === settings.p1UpKey) {
                    ply = 'p1';
                    dir = 'up';
                }
                else if (k === settings.p1DownKey) {
                    ply = 'p1';
                    dir = 'down';
                }
                else if (k === settings.p2UpKey) {
                    ply = 'p2';
                    dir = 'up';
                }
                else if (k === settings.p2DownKey) {
                    ply = 'p2';
                    dir = 'down';
                }
                else if (k === 'escape') {
                    // Send forfeit message for active games instead of stop
                    socket.send(JSON.stringify({ type: 'forfeit' }));
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
                if (k === settings.p1UpKey || k === settings.p1DownKey)
                    ply = 'p1';
                else if (k === settings.p2UpKey || k === settings.p2DownKey)
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
        if (quitBtn) {
            quitBtn.addEventListener('click', () => { cleanup(); onBack(); });
        }
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
        // Remove beforeunload handler
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Send stop message (only if game wasn't forfeited already)
        socket.send(JSON.stringify({ type: 'stop' }));
    }
    // Expose cleanup for external use
    renderPong.cleanup = cleanup;
}
function hexToRgb(hex) {
    const parsed = hex.replace(/^#/, '');
    const bigint = parseInt(parsed, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
//# sourceMappingURL=pongController.js.map