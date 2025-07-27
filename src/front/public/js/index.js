import { renderSignup } from "./controllers/signupController.js";
import { renderLogin } from "./controllers/loginController.js";
import { renderMenu } from "./controllers/menuController.js";
import { renderPong } from "./controllers/pongController.js";
import { renderProfile } from "./controllers/profileController.js";
import { renderSettings } from "./controllers/settingsController.js";
import { renderBlockExplorer } from "./controllers/blockExplorerController.js";
import { renderErrors } from "./controllers/errorController.js";
import { arcadeTemplate } from "./templates/arcadeTemplate.js";
import { checkAuth } from "./utils/auth.js";
export let socket;
const root = document.getElementById("root");
function doRender(screen) {
    if (screen === "404") {
        console.log("⚠️ rendering 404 template…", root);
        renderErrors(root, "404");
        return;
    }
    if (screen === "signup")
        renderSignup(root, () => navigate("login"));
    else if (screen === "login")
        renderLogin(root, () => navigate("menu"));
    else if (screen === "blockexplorer") {
        // Block explorer renders fullscreen without arcade frame
        renderBlockExplorer(root, () => navigate("menu"));
    }
    else {
        ensureArcadeFrame();
        const app = document.getElementById("app");
        if (!app)
            throw new Error("Le template arcade n a pas été monté");
        // Apply zoom for all screens except menu
        const arcadeEl = document.querySelector(".zoomable");
        if (arcadeEl) {
            if (screen === "menu") {
                arcadeEl.classList.remove("zoomed");
            }
            else {
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
export async function navigate(screen) {
    if (screen === "404") {
        history.pushState({ screen: "404" }, "", `?screen=404`);
        return doRender("404");
    }
    const validScreens = [
        "signup",
        "login",
        "menu",
        "2player",
        "ia",
        "online",
        "ranked",
        "profile",
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
        let initial = params.get("screen") || "menu";
        if (["2player", "ia", "online", "ranked"].includes(initial)) {
            initial = "menu";
        }
        // unknown param → 404 in‑SPA
        const valid = [
            "signup",
            "login",
            "menu",
            "2player",
            "ia",
            "online",
            "ranked",
            "profile",
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
    socket.addEventListener("close", (evt) => {
        // If the server closed with a 401, redirect to login
        navigate("login");
    });
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