import { loginTemplate } from "../templates/loginTemplate.js";
import { twofaVerifyTemplate } from "../templates/twofaVerifyTemplate.js";
import { navigate } from "../index.js";
import { initSocket } from "../index.js";
import { checkAuth, fetchUserProfile } from "../utils/auth.js";
import {
  defaultGameplaySettings,
  saveGameplaySettings,
  loadGameplaySettings,
} from "./settingsController.js";

// Global container reference for 2FA flow
let currentContainer: HTMLElement;

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
  currentContainer = container; // Store container for 2FA flow
  
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
// 7) Handling normal login + Connect Socket + 2FA
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
    const data = await res.json();
    
    // Check if 2FA is required
    if (data.require2fa) {
      console.log(">> Front: 2FA required");
      show2FAVerification(onSuccess);
      return;
    }
    
    // Normal login flow
    const { idUser } = data;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = initSocket(`${protocol}://${location.host}/ws`);
    console.log("email", email);
    socket.onopen = () => {
      const prevId = localStorage.getItem("userId");
      localStorage.setItem("userId", idUser.toString());
      if (prevId !== idUser.toString())
        saveGameplaySettings(defaultGameplaySettings);
      loadGameplaySettings();
      console.log("im here help me!!");
      onSuccess();
    };
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert("Failed to establish real-time connection");
    };
  } else if (res.status === 401) {
    // Need to get elements from current container, not document.body
    const { errName } = getElements(currentContainer);
    errName.innerHTML = "Invalid <br/>username or password";
    errName.classList.remove("hidden");
  } else {
    const { error } = await res.json();
    alert(error || "Unknown error");
  }
}

// ——————————————————————————————————————————————
// 8) 2FA Verification
function show2FAVerification(onSuccess: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (!currentContainer) {
      console.error("No container available for 2FA verification");
      resolve();
      return;
    }
    
    currentContainer.innerHTML = twofaVerifyTemplate;
    
    // Get 2FA inputs - adjust selectors to match template
    const codeInputs = currentContainer.querySelectorAll<HTMLInputElement>('#twofaVerifyForm input[type="text"]');
    const errorElement = currentContainer.querySelector('#error-2fa') as HTMLElement;
    const loginLink = currentContainer.querySelector('a[href="#login"]') as HTMLElement;
    
    // Auto-focus first input
    if (codeInputs[0]) {
      codeInputs[0].focus();
    }
    
    // Get complete code from all inputs
    const getCode = (): string => {
      return Array.from(codeInputs).map(input => input.value).join('');
    };
    
    // Clear all inputs
    const clearInputs = () => {
      codeInputs.forEach(input => input.value = '');
    };
    
    // Show error
    const showError = (message: string) => {
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
      }
    };
    
    // Clear error
    const clearError = () => {
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
    };
    
    // Handle verify
    const handleVerify = async () => {
      const code = getCode();
      clearError();
      
      if (code.length !== 6) {
        showError('Please enter a complete 6-digit code');
        return;
      }
      
      try {
        const response = await fetch('/api/2fa/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            twoFactorCode: code 
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log(">> Front: 2FA verification successful");
          await fetchUserProfile();
          
          // Initialize socket connection after 2FA success
          const protocol = location.protocol === "https:" ? "wss" : "ws";
          const socket = initSocket(`${protocol}://${location.host}/ws`);
          
          socket.onopen = () => {
            const prevId = localStorage.getItem("userId");
            localStorage.setItem("userId", data.idUser.toString());
            if (prevId !== data.idUser.toString())
              saveGameplaySettings(defaultGameplaySettings);
            loadGameplaySettings();
            
            resolve();
            onSuccess();
          };
          socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            alert("Failed to establish real-time connection");
            resolve();
          };
        } else {
          showError(data.error || 'Invalid code. Please try again.');
          // Clear inputs but keep the error message
          clearInputs();
          if (codeInputs[0]) {
            codeInputs[0].focus();
          }
        }
      } catch (error) {
        console.error('2FA verification error:', error);
        showError('Unable to contact server. Please try again.');
      }
    };
    
    // Handle back to login
    const handleBackToLogin = () => {
      resolve();
      renderLogin(currentContainer!, () => {});
    };
    
    // Handle input navigation
    codeInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        // Clear error when user starts typing
        clearError();
        
        // Only allow digits
        target.value = target.value.replace(/\D/g, '');
        
        // Move to next input if digit entered
        if (target.value && index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }
        
        // Check if all 6 fields are filled and trigger verification automatically
        const code = getCode();
        if (code.length === 6) {
          handleVerify();
        }
      });
      
      input.addEventListener('keydown', (e) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !input.value && index > 0) {
          codeInputs[index - 1].focus();
        }
      });
      
      // Handle Enter key in any input
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleVerify();
        }
      });
    });
    
    // Handle back to login link
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleBackToLogin();
      });
    }
  });
}

// ——————————————————————————————————————————————
// 9) Google Login
export function handleGoogleLogin(e: Event) {
  e.preventDefault();

  window.location.href = "/api/login/google";
}
