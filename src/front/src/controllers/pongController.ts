import { pongTemplate } from '../templates/pongTemplate.js';
import { waitingTemplate } from '../templates/loadingTemplate.js';
import { loadGameplaySettings, GameplaySettings } from './settingsController.js';

export function renderPong(container: HTMLElement, socket: WebSocket, onBack: () => void): void {
    container.innerHTML = waitingTemplate;

    const settings: GameplaySettings = loadGameplaySettings();
    let isGameActive = false;
    let keyHandlersAdded = false;

    // Store player names for display
    let player1Name = "P1";
    let player2Name = "P2";

    // Single message handler for the entire session
    const messageHandler = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'waiting' && !isGameActive) {
            container.innerHTML = waitingTemplate;
            bindCancel();

        } else if (msg.type === 'state') {
            if (!isGameActive) {
                isGameActive = true;
                container.innerHTML = pongTemplate;

                // Force update labels immediately after template is set
                setTimeout(() => {
                    updatePlayerLabels();
                }, 0);

                bindGame(msg);
            } else {
                // Just update the existing game
                render(msg);
            }
        } else if (msg.type === 'STOP') {
            console.log('Game ended:', msg.score1, msg.score2);
            cleanup();
            onBack();
        } else if (msg.type === "rankedMatchFound") {
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
            } else {
                player1Name = opponent.userName;
                player2Name = yourName;
            }

            console.log('🏷️ Final ranked player names set:', {
                player1Name,
                player2Name,
                isGameActive
            });

            // Update labels if game is already active
            if (isGameActive) {
                updatePlayerLabels();
            }
        } else if (msg.type === "matchFound") {
            console.log('🎮 matchFound message received:', msg);
            const yourP = msg.youAre;
            console.log('Online match found, you are:', yourP, 'your name:', msg.yourName, 'opponent:', msg.opponent?.userName);

            // If player names are included
            if (msg.yourName && msg.opponent) {
                console.log('🏷️ Setting online player names:', {
                    yourP,
                    yourName: msg.yourName,
                    opponentName: msg.opponent.userName
                });

                if (yourP === "p1") {
                    player1Name = msg.yourName;
                    player2Name = msg.opponent.userName;
                } else {
                    player1Name = msg.opponent.userName;
                    player2Name = msg.yourName;
                }

                console.log('🏷️ Final online player names set:', {
                    player1Name,
                    player2Name,
                    isGameActive
                });

                // Update labels if game is already active
                if (isGameActive) {
                    console.log('Updating player labels:', player1Name, player2Name);
                    updatePlayerLabels();
                }
            } else {
                console.log('❌ Missing player names in matchFound message');
            }
        }
    };

    // Function to update player labels
    function updatePlayerLabels() {
        console.log('🏷️ updatePlayerLabels called with:', { player1Name, player2Name });
        const player1Label = container.querySelector<HTMLElement>('#player1Label');
        const player2Label = container.querySelector<HTMLElement>('#player2Label');

        console.log('🏷️ Found label elements:', {
            player1Label: !!player1Label,
            player2Label: !!player2Label
        });

        if (player1Label) {
            player1Label.textContent = player1Name;
            console.log('🏷️ Set player1Label to:', player1Name);
        }
        if (player2Label) {
            player2Label.textContent = player2Name;
            console.log('🏷️ Set player2Label to:', player2Name);
        }
    }

    socket.addEventListener('message', messageHandler);

    let render: (msg: any) => void;
    let onDown: (e: KeyboardEvent) => void;
    let onUp: (e: KeyboardEvent) => void;

    function bindCancel() {
        const back = container.querySelector<HTMLButtonElement>('#backBtn');
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
        cleanup();
    });
    function bindGame(initial: any) {
        const CW = 500, CH = 300, PW = 10, PH = 60, BR = 6;

        const canvasEl = container.querySelector<HTMLCanvasElement>('#pongCanvas')!;
        const scoreEl = container.querySelector<HTMLElement>('#scoreText')!;
        const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
        const quitBtn = container.querySelector<HTMLButtonElement>('#quit')!;
        const ctx = canvasEl.getContext('2d', { alpha: true })!;
        const ballHistory: { x: number; y: number }[] = [];


        const { r, g, b } = hexToRgb(settings.bgColor);
        const a = settings.bgOpacity / 100;
        canvasEl.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
        if (settings.glowIntensity) {
            ctx.shadowBlur = settings.glowIntensity;
            ctx.shadowColor = settings.ballColor;
        }
        render = (msg: any) => {
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
            onDown = (e: KeyboardEvent) => {
                if (!isGameActive) return;

                let ply: string | null = null, dir: string | null = null;
                const k = e.key.toLowerCase();

                if (k === settings.p1UpKey) { ply = 'p1'; dir = 'up'; }
                else if (k === settings.p1DownKey) { ply = 'p1'; dir = 'down'; }
                else if (k === settings.p2UpKey) { ply = 'p2'; dir = 'up'; }
                else if (k === settings.p2DownKey) { ply = 'p2'; dir = 'down'; }
                else if (k === 'escape') { cleanup(); onBack(); return; }

                if (ply && dir) {
                    socket.send(JSON.stringify({ type: 'input', player: ply, dir }));
                }
            };

            onUp = (e: KeyboardEvent) => {
                if (!isGameActive) return;

                let ply: string | null = null;
                const k = e.key.toLowerCase();

                if (k === settings.p1UpKey || k === settings.p1DownKey) ply = 'p1';
                else if (k === settings.p2UpKey || k === settings.p2DownKey) ply = 'p2';

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

        // Send stop message
        socket.send(JSON.stringify({ type: 'stop' }));
    }

    // Expose cleanup for external use
    (renderPong as any).cleanup = cleanup;
}

function hexToRgb(hex: string) {
    const parsed = hex.replace(/^#/, '');
    const bigint = parseInt(parsed, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}