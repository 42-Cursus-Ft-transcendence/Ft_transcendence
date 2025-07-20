import { signupTemplate } from "../templates/signupTemplate.js";
import { navigate } from "../index.js";

export function renderSignup(
  container: HTMLElement,
  onSuccess: () => void
): void {
  container.innerHTML = signupTemplate;

  const form = container.querySelector<HTMLFormElement>("#signupForm")!;
  const btn = container.querySelector<HTMLButtonElement>("#submitBtn")!;
  const txt = container.querySelector<HTMLSpanElement>("#submitText")!;
  const nameInput = container.querySelector<HTMLInputElement>("#name")!;
  const emailInput = container.querySelector<HTMLInputElement>("#email")!;
  const passInput = container.querySelector<HTMLInputElement>("#password")!;
  const confirmPassInput = container.querySelector<HTMLInputElement>("#confirmPassword")!;
  const errName = container.querySelector<HTMLParagraphElement>("#error-name")!;
  const errEmail =
    container.querySelector<HTMLParagraphElement>("#error-email")!;
  const errPass =
    container.querySelector<HTMLParagraphElement>("#error-password")!;
  const errConfirmPass =
    container.querySelector<HTMLParagraphElement>("#error-confirmPassword")!;
  const loginLinker =
    container.querySelector<HTMLAnchorElement>('a[href="#login"]')!;
  const togglePassword = container.querySelector("#togglePassword")!;
  const toggleConfirmPassword = container.querySelector("#toggleConfirmPassword")!;

  loginLinker.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("login");
  });

  // Toggle password visibility
  togglePassword.addEventListener("click", () => {
    const isPassword = passInput.type === "password";
    if (isPassword) {
      passInput.type = "text";
      togglePassword.className = "bx bx-eye text-blue-300 cursor-pointer hover:text-pink-400 transition";
    } else {
      passInput.type = "password";
      togglePassword.className = "bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition";
    }
  });

  // Toggle confirm password visibility
  toggleConfirmPassword.addEventListener("click", () => {
    const isPassword = confirmPassInput.type === "password";
    if (isPassword) {
      confirmPassInput.type = "text";
      toggleConfirmPassword.className = "bx bx-eye text-blue-300 cursor-pointer hover:text-pink-400 transition";
    } else {
      confirmPassInput.type = "password";
      toggleConfirmPassword.className = "bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1) Reset des erreurs
    [errName, errEmail, errPass, errConfirmPass].forEach((p) => {
      p.textContent = "";
      p.classList.add("hidden");
    });

    // 2) Validation front
    let valid = true;
    if (nameInput.value.trim().length === 0) {
      errName.textContent = "Le nom est requis";
      errName.classList.remove("hidden");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      errEmail.textContent = "Email invalide";
      errEmail.classList.remove("hidden");
      valid = false;
    }
    if (passInput.value.length < 8) {
      errPass.textContent = "Le mot de passe doit faire ≥ 8 caractères";
      errPass.classList.remove("hidden");
      valid = false;
    }
    if (passInput.value !== confirmPassInput.value) {
      errConfirmPass.textContent = "Les mots de passe ne correspondent pas";
      errConfirmPass.classList.remove("hidden");
      valid = false;
    }

    if (!valid) return;
    btn.disabled = true;
    txt.textContent = "Creation in progress…";

    try {
      console.log("Sending fetch...");
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-Type": "application/json" },
        body: JSON.stringify({
          userName: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passInput.value,
        }),
      });

      if (res.status === 201) {
        const { idUser } = await res.json();
        console.log("Utilisateur créé #", idUser);
        onSuccess();
      } else {
        const err = await res.json();
        if (res.status === 400) {
          errName.textContent = err.error;
          errName.classList.remove("hidden");
        } else alert(err.error || "Unknown error");
      }
    } catch (networkError) {
      alert("Unable to contact the server");
    } finally {
      btn.disabled = false;
      txt.textContent = "Create account";
    }
  });
}
