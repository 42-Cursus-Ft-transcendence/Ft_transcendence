import { loginTemplate } from "../templates/loginTemplate.js";
import { navigate } from "../index.js";
import { initSocket } from "../index.js";
async function checkAuth() {
    try {
        const res = await fetch("/me", {
            method: "POST",
            credentials: "include",
        });
        console.log(">> Front: checking auth status", res.status);
        return res.ok;
    }
    catch {
        console.error(">> Front: error checking auth status");
        return false;
    }
}
export async function renderLogin(container, onSuccess) {
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
function getElements(container) {
    return {
        form: container.querySelector("#loginForm"),
        btn: container.querySelector("#submitBtn"),
        txt: container.querySelector("#submitText"),
        nameInput: container.querySelector("#name"),
        passInput: container.querySelector("#password"),
        errName: container.querySelector("#error-name"),
        errPass: container.querySelector("#error-password"),
        signupLink: container.querySelector('a[href="#signup"]'),
        googleBtn: container.querySelector("#googleBtn"),
    };
}
// ——————————————————————————————————————————————
// 2) Nomal signup link
function handleSignup(e) {
    e.preventDefault();
    navigate("signup");
}
// ——————————————————————————————————————————————
// 3) Handler to send it to form (err checking + exec logic)
async function handleFormSubmit(e, el, onSuccess) {
    e.preventDefault();
    resetErrors(el);
    if (!validateForm(el)) {
        return;
    }
    toggleUi(el, true, "Connecting ...");
    try {
        await performLogin(el, onSuccess);
    }
    catch (err) {
        alert("Unable to contact the server");
    }
    finally {
        toggleUi(el, false, "LOG IN");
    }
}
// ——————————————————————————————————————————————
// 4) err init
function resetErrors({ errName, errPass }) {
    [errName, errPass].forEach((p) => {
        p.textContent = "";
        p.classList.add("hidden");
    });
}
// ——————————————————————————————————————————————
// 5) Front Validation
function validateForm({ nameInput, passInput, errName, errPass, }) {
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
function toggleUi(el, loading, text) {
    el.btn.disabled = loading;
    el.txt.textContent = text;
}
// ——————————————————————————————————————————————
// 7) Handling normal login + Connect Socket
async function performLogin({ nameInput, passInput }, onSuccess) {
    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            userName: nameInput.value.trim(),
            password: passInput.value,
        }),
    });
    if (res.ok) {
        const { userName, email, idUser } = await res.json();
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const socket = initSocket(`${protocol}://${location.host}/ws`);
        socket.onopen = () => {
            localStorage.setItem("userId", idUser.toString());
            localStorage.setItem("userName", userName);
            localStorage.setItem("email", email);
            onSuccess();
        };
        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            alert("Failed to establish real-time connection");
        };
    }
    else if (res.status === 401) {
        const { errName } = getElements(document.body); // 또는 el.errName을 전달하도록 변경
        errName.innerHTML = "Invalid <br/>username or password";
        errName.classList.remove("hidden");
    }
    else {
        const { error } = await res.json();
        alert(error || "Unknown error");
    }
}
// ——————————————————————————————————————————————
// 8) Google Login
async function handleGoogleLogin(e) {
    e.preventDefault();
    window.location.href = `/api/login/google`;
}
// 9) handling google callback
export async function handleOAuthCallback(el = {}, onSuccess) {
    const qp = new URLSearchParams(window.location.search);
    const code = qp.get("code");
    const state = qp.get("state");
    if (!code || !state) {
        alert("Authorization code or state is missing.");
        return;
    }
    const { googleBtn, errName } = el;
    googleBtn?.setAttribute("disabled", "true");
    if (googleBtn)
        googleBtn.textContent = "Logging in …";
    try {
        const res = await fetch(`/api/login/google/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`, {
            credentials: "include",
            headers: { Accept: "application/json" },
        });
        console.log(code, state);
        const data = await res.json();
        if (!data.ok) {
            alert(data.error || "OAuth login failed");
            return;
        }
        const { token, userInfo } = data;
        localStorage.setItem("token", token);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        onSuccess();
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const socket = initSocket(`${protocol}://${location.host}/ws`);
        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            alert("Failed to establish real-time connection");
        };
    }
    catch (err) {
        // 7) 실패 시: 콘솔·알럿으로만 표시
        console.error("OAuth error:", err);
        alert(err.message || "Unexpected error during OAuth login");
    }
    finally {
        // 8) 더 이상 UI 리셋할 요소가 없으므로 비워 둠
    }
}
//# sourceMappingURL=loginController.js.map