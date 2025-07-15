import { loginTemplate } from "../templates/loginTemplate.js";
import { navigate } from "../index.js";
import { initSocket } from "../index.js";
import { checkAuth } from "../utils/auth.js";
import {
  defaultGameplaySettings,
  saveGameplaySettings,
  loadGameplaySettings,
} from "./settingsController.js";

interface LoginElements {
  form: HTMLFormElement;
  btn: HTMLButtonElement;
  txt: HTMLSpanElement;
  nameInput: HTMLInputElement;
  passInput: HTMLInputElement;
  errName: HTMLParagraphElement;
  errPass: HTMLParagraphElement;
  signupLink: HTMLAnchorElement;
  googleBtn: HTMLButtonElement;
}

export async function renderLogin(
  container: HTMLElement,
  onSuccess: () => void
): Promise<void> {
  const isAuth = await checkAuth();
  if (isAuth) {
    console.log(">> Front: already authenticated → redirecting to menu");
    onSuccess();
    return;
  }

  container.innerHTML = loginTemplate;
  const el = getElements(container);

  // binding event
  el.signupLink.addEventListener("click", handleSignup);
  el.form.addEventListener("submit", (e) => handleFormSubmit(e, el, onSuccess));
  el.googleBtn.addEventListener("click", handleGoogleLogin);
}

// ——————————————————————————————————————————————
// 1)  Isolating element references
function getElements(container: HTMLElement): LoginElements {
  return {
    form: container.querySelector("#loginForm")!,
    btn: container.querySelector("#submitBtn")!,
    txt: container.querySelector("#submitText")!,
    nameInput: container.querySelector("#name")!,
    passInput: container.querySelector("#password")!,
    errName: container.querySelector("#error-name")!,
    errPass: container.querySelector("#error-password")!,
    signupLink:
      container.querySelector<HTMLAnchorElement>('a[href="#signup"]')!,
    googleBtn: container.querySelector("#googleBtn")!,
  };
}

// ——————————————————————————————————————————————
// 2) Nomal signup link
function handleSignup(e: Event) {
  e.preventDefault();
  navigate("signup");
}

// ——————————————————————————————————————————————
// 3) Handler to send it to form (err checking + exec logic)
async function handleFormSubmit(
  e: Event,
  el: LoginElements,
  onSuccess: () => void
) {
  e.preventDefault();

  resetErrors(el);

  if (!validateForm(el)) {
    return;
  }

  toggleUi(el, true, "Connecting ...");

  try {
    await performLogin(el, onSuccess);
  } catch (err) {
    alert("Unable to contact the server");
  } finally {
    toggleUi(el, false, "LOG IN");
  }
}

// ——————————————————————————————————————————————
// 4) err init
function resetErrors({ errName, errPass }: LoginElements) {
  [errName, errPass].forEach((p) => {
    p.textContent = "";
    p.classList.add("hidden");
  });
}

// ——————————————————————————————————————————————
// 5) Front Validation
function validateForm({
  nameInput,
  passInput,
  errName,
  errPass,
}: LoginElements) {
  let valid = true;

  if (nameInput.value.trim().length === 0) {
    errName.textContent = "Username is required";
    errName.classList.remove("hidden");
    valid = false;
  }
  if (passInput.value.length === 0) {
    errPass.textContent = "Password is required";
    errPass.classList.remove("hidden");
    valid = false;
  }

  return valid;
}

// ——————————————————————————————————————————————
// 6) UI toggle (button inactivity + Text change)
function toggleUi(el: LoginElements, loading: boolean, text: string) {
  el.btn.disabled = loading;
  el.txt.textContent = text;
}

// ——————————————————————————————————————————————
// 7) Handling normal login + Connect Socket
async function performLogin(
  { nameInput, passInput }: LoginElements,
  onSuccess: () => void
) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userName: nameInput.value.trim(),
      password: passInput.value,
    }),
  });

  if (res.ok) {
    const { userName, email, idUser, avatarURL } = await res.json();
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = initSocket(`${protocol}://${location.host}/ws`);

    socket.onopen = () => {
      const prevId = localStorage.getItem("userId");
      localStorage.setItem("userId", idUser.toString());
      localStorage.setItem("userName", userName);
      localStorage.setItem("email", email);
      localStorage.setItem("avatarURL", avatarURL);
      
      if (prevId !== idUser.toString())
        saveGameplaySettings(defaultGameplaySettings);
      loadGameplaySettings();

      onSuccess();
    };
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert("Failed to establish real-time connection");
    };
  } else if (res.status === 401) {
    const { errName } = getElements(document.body); // 또는 el.errName을 전달하도록 변경
    errName.innerHTML = "Invalid <br/>username or password";
    errName.classList.remove("hidden");
  } else {
    const { error } = await res.json();
    alert(error || "Unknown error");
  }
}

// ——————————————————————————————————————————————
// 8) Google Login
export function handleGoogleLogin(e: Event) {
  e.preventDefault();
  window.location.href = "/api/login/google";
}
