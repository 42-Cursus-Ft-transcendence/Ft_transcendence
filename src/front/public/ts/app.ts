// src/front/public/js/app.ts

interface Route {
  render: () => string;
  init?: () => void;
}

// 1) Home view with a Play button
function homeView(): string {
  return `
    <h1>🏓 Pong Arcade</h1>
    <p>Ready to play?</p>
    <button id="playbutton" class="px-4 py-2 bg-accent text-white rounded">Play Pong</button>
  `;
}

// 2) Pong view (canvas only)
function pongView(): string {
  return `
    <canvas id="pongCanvas" width="600" height="400"
            class="border-2 border-primary block mx-auto"></canvas>
  `;
}

// 3) Pong initialization (as before)
function startPong(): void {
  const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
  const ctx    = canvas.getContext('2d')!;
  // … your paddle/ball & loop code …
}

// 4) Define your routes
const routes: Record<string, Route> = {
  home: {
    render: homeView,
    init: () => {
        console.log("route is working");
      const btn = document.getElementById('playbutton');
      if (!btn) return;
      btn.addEventListener('click', () => {
        // Change the hash to "#pong", which triggers the router
        location.hash = 'pong';
      });
    }
  },
  pong: {
    render: pongView,
    init: startPong
  }
};

// 5) The router
function router(): void {
  const name = location.hash.slice(1) || 'home';
  const route = routes[name] || routes.home;

  // Inject the HTML
  const appEl = document.getElementById('app')!;
  appEl.innerHTML = route.render();

  // Call the init (attach button handlers or start game)
  route.init?.();
}

// 6) Listen for hash changes and initial load
window.addEventListener('hashchange', router);
window.addEventListener('load',        router);
