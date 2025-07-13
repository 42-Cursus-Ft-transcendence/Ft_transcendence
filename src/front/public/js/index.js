import { renderSignup } from "./controllers/signupController.js";
import { renderLogin } from "./controllers/loginController.js";
import { renderMenu } from "./controllers/menuController.js";
import { renderPong } from "./controllers/pongController.js";
import { renderProfile } from "./controllers/profileController.js";
import { renderSettings } from "./controllers/settingsController.js";
import { arcadeTemplate } from "./templates/arcadeTemplate.js";
import { checkAuth } from "./utils/auth.js";
export let socket;
const root = document.getElementById("root");
function doRender(screen) {
    if (screen === "signup")
        renderSignup(root, () => navigate("login"));
    else if (screen === "login")
        renderLogin(root, () => navigate("menu"));
    else {
        ensureArcadeFrame();
        const app = document.getElementById("app");
        if (!app)
            throw new Error("Le template arcade n a pas été monté");
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
            case "profile":
                renderProfile(app, () => navigate("menu"));
                break;
            case "settings":
                renderSettings(app, () => navigate("menu"));
                break;
            default:
                renderSignup(root, () => navigate("menu"));
                break;
        }
    }
}
/**
 * Change d'écran et met à jour l'historique
 */
export async function navigate(screen) {
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
        // Récupère l’écran demandé dans l’URL
        const params = new URLSearchParams(location.search);
        const initialScreen = params.get("screen") || "menu";
        history.replaceState({ screen: initialScreen }, "", location.href);
        navigate(initialScreen);
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const socket = initSocket(`${protocol}://${location.host}/ws`);
        socket.addEventListener("close", (evt) => {
            // 서버에서 401로 닫았다면, 화면 전환
            navigate("login");
        });
    })();
});
// Lorsque l’utilisateur clique sur Précédent/Suivant
window.addEventListener("popstate", async (event) => {
    let screen = event.state?.screen;
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
export function initSocket(url) {
    socket = new WebSocket(url);
    socket.onopen = () => console.log("✅ WebSocket connectée");
    socket.onerror = (err) => console.error("❌ Erreur WebSocket", err);
    socket.onclose = () => console.log("⚠️ WebSocket fermée");
    return socket;
}
// If you need to access the socket elsewhere
export function getSocket() {
    return socket;
}
//# sourceMappingURL=index.js.map