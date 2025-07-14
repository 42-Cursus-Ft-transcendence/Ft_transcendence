import { menuTemplate } from "../templates/menuTemplate.js";
// import { sendLogout } from "../index.js"

export type ScreenChoise =
  | "2player"
  | "ia"
  | "online"
  | "profile"
  | "settings"
  | "login";

export function renderMenu(
  container: HTMLElement,
  socket: WebSocket,
  onSelect: (choice: ScreenChoise) => void
): void {
  container.innerHTML = menuTemplate;

  const arcadeEl = document.querySelector<HTMLElement>(".zoomable")!;

  // Zoom sur le container au clic d'un bouton
  const zoomIn = () => arcadeEl.classList.add("zoomed");

  if (arcadeEl.classList.contains("zoomed"))
    arcadeEl.classList.remove("zoomed");

  container.querySelector("#btn2p")!.addEventListener("click", () => {
    zoomIn();
    socket.send(JSON.stringify({ type: "start", vs: "player" }));
    onSelect("2player");
  });

  container.querySelector("#btnIa")!.addEventListener("click", () => {
    zoomIn();
    socket.send(JSON.stringify({ type: "start", vs: "bot", difficulty: 1 }));
    onSelect("ia");
  });
  container.querySelector("#btnOnline")!.addEventListener("click", () => {
    zoomIn();
    socket.send(JSON.stringify({ type: "start", vs: "online" }));
    onSelect("online");
  });
  container.querySelector("#btnProfile")!.addEventListener("click", () => {
    zoomIn();
    onSelect("profile");
  });
  container.querySelector("#btnSettings")!.addEventListener("click", () => {
    zoomIn();
    onSelect("settings");
  });
  container
    .querySelector<HTMLButtonElement>("#btnLogout")!
    .addEventListener("click", async () => {
      try {
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          keepalive: true,
        });
      } catch (err) {}
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("email");
      onSelect("login");
    });
}
