import { menuTemplate } from "../templates/menuTemplate.js";
import { loadGameplaySettings } from './settingsController.js';
// Convert difficulty setting to numeric value
function getDifficultyValue(difficulty) {
    switch (difficulty) {
        case 'Easy': return 0.2;
        case 'Normal': return 0.5;
        case 'Hard': return 1;
        default: return 0.5; // fallback to Normal
    }
}
export function renderMenu(container, socket, onSelect) {
    container.innerHTML = menuTemplate;
    const arcadeEl = document.querySelector(".zoomable");
    // Zoom sur le container au clic d'un bouton
    const zoomIn = () => arcadeEl.classList.add("zoomed");
    if (arcadeEl.classList.contains("zoomed"))
        arcadeEl.classList.remove("zoomed");
    container.querySelector("#btn2p").addEventListener("click", () => {
        zoomIn();
        socket.send(JSON.stringify({ type: "start", vs: "player" }));
        onSelect("2player");
    });
    container.querySelector("#btnIa").addEventListener("click", () => {
        zoomIn();
        // Load current gameplay settings to get AI difficulty
        const gameplaySettings = loadGameplaySettings();
        const difficultyValue = getDifficultyValue(gameplaySettings.difficulty);
        console.log(`Starting game against AI with difficulty: ${difficultyValue}`);
        socket.send(JSON.stringify({ type: "start", vs: "bot", difficulty: difficultyValue }));
        onSelect("ia");
    });
    container.querySelector("#btnOnline").addEventListener("click", () => {
        zoomIn();
        socket.send(JSON.stringify({ type: "start", vs: "online" }));
        onSelect("online");
    });
    container.querySelector("#btnProfile").addEventListener("click", () => {
        zoomIn();
        onSelect("profile");
    });
    container.querySelector("#btnSettings").addEventListener("click", () => {
        zoomIn();
        onSelect("settings");
    });
    container.querySelector("#btnBlockExplorer").addEventListener("click", () => {
        zoomIn();
        onSelect("blockexplorer");
    });
    container
        .querySelector("#btnLogout")
        .addEventListener("click", async () => {
        try {
            const res = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
                keepalive: true,
            });
        }
        catch (err) { }
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("email");
        localStorage.removeItem("avatarURL");
        onSelect("login");
    });
}
//# sourceMappingURL=menuController.js.map