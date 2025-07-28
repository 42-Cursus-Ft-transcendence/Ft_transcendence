import { renderSignup } from "./controllers/signupController.js";
import { renderLogin } from "./controllers/loginController.js";
import { renderMenu } from "./controllers/menuController.js";
import { renderPong } from "./controllers/pongController.js";
import { renderProfile } from "./controllers/profileController.js";
import { renderFriends } from "./controllers/friendsControllers.js";
import { renderSettings } from "./controllers/settingsController.js";
import { renderBlockExplorer } from "./controllers/blockExplorerController.js";
import { renderErrors } from "./controllers/errorController.js";
import { arcadeTemplate } from "./templates/arcadeTemplate.js";
import { checkAuth } from "./utils/auth.js";
import { backgroundMusic } from "./utils/backgroundMusic.js";
import { loadGameplaySettings, applyMusicStateFromSettings } from "./controllers/settingsController.js";

// Type des écrans disponibles
export type Screen =
  | "signup"
  | "login"
  | "menu"
  | "2player"
  | "ia"
  | "online"
  | "ranked"
  | "profile"
  | "friends"
  | "settings"
  | "blockexplorer"
  | "404";

export let socket: WebSocket;
const root = document.getElementById("root") as HTMLElement;

// Heartbeat configuration
const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 5000;   // 5 seconds to wait for pong
let pingTimer: number | null = null;
let pongTimer: number | null = null;
let isReconnecting = false;

function doRender(screen: Screen) {
  if (screen === "404") {
    console.log("⚠️ rendering 404 template…", root);
    renderErrors(root, "404");
    return;
  }
  if (screen === "signup") {
    backgroundMusic.pause(); // Stop music for signup/login screens
    renderSignup(root, () => navigate("login"));
  } else if (screen === "login") {
    backgroundMusic.pause(); // Stop music for signup/login screens
    renderLogin(root, () => navigate("menu"));
  } else if (screen === "blockexplorer") {
    applyMusicStateFromSettings();
    renderBlockExplorer(root, () => navigate("menu"));
  } else {
    // Apply saved music settings (volume and play/pause state)
    applyMusicStateFromSettings();

    ensureArcadeFrame();
    const app = document.getElementById("app");
    if (!app) throw new Error("Le template arcade n a pas été monté");

    // Apply zoom for all screens except menu
    const arcadeEl = document.querySelector<HTMLElement>(".zoomable");
    if (arcadeEl) {
      if (screen === "menu") {
        arcadeEl.classList.remove("zoomed");
      } else {
        arcadeEl.classList.add("zoomed");
      }
    }

    switch (screen) {
      case "menu":
        renderMenu(app, socket, (choice) => navigate(choice));
        break;
      case "2player":
        renderPong(app, socket, () => navigate("menu"));
        break;
      case "ia":
        renderPong(app, socket, () => navigate("menu"));
        break;
      case "online":
        renderPong(app, socket, () => navigate("menu"));
        break;
      case "ranked":
        renderPong(app, socket, () => navigate("menu"));
        break;
      case "profile":
        renderProfile(app, () => navigate("menu"));
        break;
      case "friends":
        renderFriends(app, socket, () => navigate("menu"));
        break;
      case "settings":
        renderSettings(app, () => navigate("menu"));
        break;
      default:
        renderSettings(app, () => navigate("menu"));
        break;
    }
  }
}

/**
 * Change d'écran et met à jour l'historique
 */
export async function navigate(screen: Screen) {
  if (screen === "404") {
    history.pushState({ screen: "404" }, "", `?screen=404`);
    return doRender("404");
  }
  const validScreens: Screen[] = [
    "signup",
    "login",
    "menu",
    "2player",
    "ia",
    "online",
    "ranked",
    "profile",
    "friends",
    "settings",
    "blockexplorer",
    "404",
  ];
  if (!validScreens.includes(screen)) {
    // render in‑SPA 404
    history.pushState({ screen: "404" }, "", `?screen=404`);
    return doRender("404");
  }

  if (screen !== "login" && screen !== "signup") {
    const isAuth = await checkAuth();
    if (!isAuth) {
      console.log(">> SPA Guard: not authenticated → redirecting to login");
      history.pushState({ screen: "login" }, "", `?screen=login`);
      return doRender("login");
    }
  }
  history.pushState({ screen }, "", `?screen=${screen}`);
  doRender(screen);
}

// Au chargement initial du document HTML
window.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const params = new URLSearchParams(location.search);
    let initial = (params.get("screen") as Screen) || "menu";
    if (["2player", "ia", "online", "ranked"].includes(initial)) {
      initial = "menu";
    }
    // unknown param → 404 in‑SPA
    const valid: Screen[] = [
      "signup",
      "login",
      "menu",
      "2player",
      "ia",
      "online",
      "ranked",
      "profile",
      "friends",
      "settings",
      "blockexplorer",
      "404",
    ];
    if (initial !== "login" && initial !== "signup") {
      const isAuth = await checkAuth();
      if (!isAuth) {
        initial = "login";
      }
    }
    if (!valid.includes(initial)) {
      initial = "404";
    }

    history.replaceState({ screen: initial }, "", `?screen=${initial}`);
    navigate(initial);
  })();

  // WebSocket setup follows…
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = initSocket(`${protocol}://${location.host}/ws`);

  // Handle page refresh/close - force clean disconnection
  window.addEventListener("beforeunload", () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, "Page unloading");
    }
  });
});

// Lorsque l’utilisateur clique sur Précédent/Suivant
window.addEventListener("popstate", async (event) => {
  let screen = (event.state as { screen?: Screen })?.screen;
  //const stillAuth = await checkAuth();
  //   Si connecté, on ne veut jamais login/signup
  if (screen === "login" || screen === "signup") {
    screen = "menu";
  }
  // 4) Si déconnecté, et qu’on veut aller au menu, on redirige sur login
  if (screen === "menu") {
    screen = "login";
  }
  console.log("popstate", screen);
  doRender(screen || "login");
});

function ensureArcadeFrame() {
  // Si #app n'existe pas encore, on l'injecte dans `root`
  if (!document.getElementById("app")) {
    root.innerHTML = arcadeTemplate;
  }
}

// Export function to initialize the socket
export function initSocket(url: string) {
  socket = new WebSocket(url);
  
  socket.onopen = () => {
    console.log("✅ WebSocket connectée");
    isReconnecting = false;
    startHeartbeat();
  };
  
  socket.onerror = (err) => console.error("❌ Erreur WebSocket", err);
  
  socket.onclose = (evt) => {
    console.log("⚠️ WebSocket fermée");
    stopHeartbeat();
    
    // Check if this is an authentication error (401) or clean close
    if (evt.code === 1002 || evt.code === 1008) {
      // Authentication failed - redirect to login
      navigate("login");
      return;
    }
    
    // Only attempt reconnection if not a clean close (1000) and not already reconnecting
    if (evt.code !== 1000 && !isReconnecting) {
      attemptReconnection(url);
    }
  };

  // Add pong handling to existing message handler
  const originalOnMessage = socket.onmessage;
  socket.addEventListener('message', (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'pong') {
        if (pongTimer) {
          window.clearTimeout(pongTimer);
          pongTimer = null;
        }
        // Don't call other handlers for pong messages
        return;
      }
    } catch (e) {
      // Not JSON or not a pong, let other handlers deal with it
    }
  });
  
  return socket;
}

function startHeartbeat() {
  stopHeartbeat(); // Clear any existing timers
  
  pingTimer = window.setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      // Send ping
      socket.send(JSON.stringify({ type: 'ping' }));
      
      // Set timeout for pong response
      pongTimer = window.setTimeout(() => {
        console.log("❌ Pong timeout - connection appears dead");
        // Force close to trigger reconnection
        socket.close();
      }, PONG_TIMEOUT);
    }
  }, PING_INTERVAL);
}

function stopHeartbeat() {
  if (pingTimer) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }
  if (pongTimer) {
    window.clearTimeout(pongTimer);
    pongTimer = null;
  }
}

function attemptReconnection(url: string) {
  if (isReconnecting) return;
  
  isReconnecting = true;
  console.log("🔄 Attempting WebSocket reconnection...");
  
  // Wait 2 seconds before reconnecting
  window.setTimeout(() => {
    try {
      initSocket(url);
    } catch (err) {
      console.error("❌ Reconnection failed:", err);
      isReconnecting = false;
    }
  }, 2000);
}

// If you need to access the socket elsewhere
export function getSocket() {
  return socket;
}

// Function to update background music volume
export function updateMusicVolume(volume: number) {
  backgroundMusic.setVolume(volume / 100); // Convert percentage to 0-1 range
}
