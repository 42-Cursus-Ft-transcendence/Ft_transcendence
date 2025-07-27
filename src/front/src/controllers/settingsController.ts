import { settingsTemplate } from "../templates/settingsTemplate.js";
import { fetchUserProfile } from "../utils/auth.js";

export interface GameplaySettings {
  difficulty: "Easy" | "Normal" | "Hard";
  colorTheme: "Vaporwave" | "Cyberpunk" | "Retro" | "Monochrome";
  ballColor: string;
  paddleColor: string;
  glowIntensity: number;
  trailLength: number;
  bgColor: string;
  bgOpacity: number;
  p1UpKey: string;
  p1DownKey: string;
  p2UpKey: string;
  p2DownKey: string;
}

export const defaultGameplaySettings: GameplaySettings = {
  difficulty: "Normal",
  colorTheme: "Vaporwave",
  ballColor: "#ff00aa",
  paddleColor: "#00f0ff",
  glowIntensity: 0,
  trailLength: 0,
  bgColor: "#000000",
  bgOpacity: 70,
  p1UpKey: "w",
  p1DownKey: "s",
  p2UpKey: "arrowup",
  p2DownKey: "arrowdown",
};

export function loadGameplaySettings(): GameplaySettings {
  const raw = localStorage.getItem("gameplaySettings");
  if (raw) {
    try {
      return JSON.parse(raw) as GameplaySettings;
    } catch {
      /* ignore parse errors */
    }
  }
  localStorage.setItem(
    "gameplaySettings",
    JSON.stringify(defaultGameplaySettings)
  );
  return defaultGameplaySettings;
}

export function saveGameplaySettings(s: GameplaySettings) {
  localStorage.setItem("gameplaySettings", JSON.stringify(s));
}

const palettes = {
  Vaporwave: {
    ballColor: "#ff77aa",
    paddleColor: "#77ccff",
    bgColor: "#1a0033",
    glowIntensity: 0,
    trailLength: 0,
    bgOpacity: 70,
  },
  Cyberpunk: {
    ballColor: "#ff00ff",
    paddleColor: "#00ffff",
    bgColor: "#0a0a0a",
    glowIntensity: 15,
    trailLength: 10,
    bgOpacity: 90,
  },
  Retro: {
    ballColor: "#ffff00",
    paddleColor: "#00ff00",
    bgColor: "#0000aa",
    glowIntensity: 5,
    trailLength: 5,
    bgOpacity: 80,
  },
  Monochrome: {
    ballColor: "#ffffff",
    paddleColor: "#888888",
    bgColor: "#000000",
    glowIntensity: 0,
    trailLength: 2,
    bgOpacity: 100,
  },
} as const;

export async function renderSettings(
  container: HTMLElement,
  onBack: () => void
) {
  // Cleanup any existing keybind capture when switching views
  cleanupKeybindCapture();

  container.innerHTML = settingsTemplate;
  bindBackButton(container, onBack);
  await bindAccountSection(container);
  bindGameplaySection(container);
  await bindSecuritySection(container);
  bindTabNavigation(container);
}

/**
 * Cleanup function to be called when leaving settings page
 */
export function cleanupSettings() {
  cleanupKeybindCapture();
}

/**
 * Bind the back button in the top-right corner.
 */
function bindBackButton(container: HTMLElement, onBack: () => void) {
  const backBtn = container.querySelector<HTMLButtonElement>("#backBtn")!;
  backBtn.addEventListener("click", () => {
    cleanupKeybindCapture(); // Cleanup before navigating away
    onBack();
  });
}

/**
 * Setup Account settings: profile info, avatar picker, form submission.
 */
async function bindAccountSection(container: HTMLElement) {
  interface UserProfile {
    userName: string;
    email: string;
    avatarURL?: string;
    isTotpEnabled?: boolean;
  }

  // Fetch user profile from API
  const userData = await fetchUserProfile();
  if (!userData) {
    alert("Unable to load user profile");
    return;
  }

  const profile: Partial<UserProfile> = {
    userName: userData.userName,
    email: userData.email,
    avatarURL: userData.avatarURL,
    isTotpEnabled: userData.isTotpEnabled,
  };
  const originalAvatarURL = userData.avatarURL;

  // Selectors
  const profileImg = container.querySelector<HTMLImageElement>("#profile-img")!;
  const modal = container.querySelector<HTMLDivElement>("#avatar-selector")!;
  const fileInput =
    container.querySelector<HTMLInputElement>("#avatar-file-input")!;
  const usernameInput =
    container.querySelector<HTMLInputElement>("#username-input")!;
  const emailInput = container.querySelector<HTMLInputElement>("#email-input")!;
  const formAccount =
    container.querySelector<HTMLFormElement>("#form-account")!;
  const errName =
    container.querySelector<HTMLParagraphElement>("#error-username")!;
  const errEmail =
    container.querySelector<HTMLParagraphElement>("#error-email")!;
  const btnAcct =
    container.querySelector<HTMLButtonElement>("#accountSubmitBtn")!;
  const txtAcct =
    container.querySelector<HTMLSpanElement>("#accountSubmitText")!;

  // Initialize fields
  if (profile.avatarURL) profileImg.src = profile.avatarURL;
  if (profile.userName) usernameInput.value = profile.userName;
  if (profile.email) emailInput.value = profile.email;

  // Avatar modal management
  const avatarCloseBtn = modal.querySelector<HTMLButtonElement>("#avatar-close");
  const errorAvatar = modal.querySelector<HTMLParagraphElement>("#error-avatar-modal");

  // Clear any previous errors when opening modal
  const clearAvatarError = () => {
    if (errorAvatar) {
      errorAvatar.textContent = "";
      errorAvatar.classList.add("hidden");
    }
  };

  // Show avatar error
  const showAvatarError = (message: string) => {
    if (errorAvatar) {
      errorAvatar.textContent = message;
      errorAvatar.classList.remove("hidden");
    }
  };

  // Close modal function
  const closeAvatarModal = () => {
    modal.classList.add("hidden");
    clearAvatarError();
  };

  // Avatar modal open
  profileImg.addEventListener("click", () => {
    modal.classList.remove("hidden");
    clearAvatarError();
  });

  // Close button
  avatarCloseBtn?.addEventListener("click", closeAvatarModal);

  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeAvatarModal();
    }
  });

  // Predefined avatars
  modal.querySelectorAll<HTMLImageElement>(".avatar-option").forEach((img) => {
    img.addEventListener("click", () => {
      const url = img.dataset.src!;
      profile.avatarURL = url;
      profileImg.src = url;
      closeAvatarModal();
    });
  });

  // Import custom avatar
  container
    .querySelector<HTMLDivElement>("#avatar-import")!
    .addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      clearAvatarError();
      // Convert file to Base64 for database storage
      const base64URL = await handleFileUpload(file);
      profile.avatarURL = base64URL;
      profileImg.src = base64URL;
      closeAvatarModal();
    } catch (error) {
      console.error("Error uploading file:", error);
      showAvatarError(error instanceof Error ? error.message : "Error uploading avatar");
    }
  });

  // Account form submission (PUT /api/account)
  formAccount.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetErrors(errName, errEmail);
    let valid = true;

    const payload: Partial<UserProfile> = {};
    const newName = usernameInput.value.trim();
    const newEmail = emailInput.value.trim();

    // Handle username changes
    if (newName !== profile.userName) {
      if (!newName) {
        showError(errName, "Username is required");
        valid = false;
      } else {
        payload.userName = newName;
      }
    }

    // Handle email changes
    if (newEmail !== profile.email) {
      if (!newEmail) {
        // Allow empty email (optional field)
        payload.email = "";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showError(errEmail, "Invalid email address");
        valid = false;
      } else {
        payload.email = newEmail;
      }
    }

    // Handle avatar changes
    if (profile.avatarURL && profile.avatarURL !== originalAvatarURL) {
      payload.avatarURL = profile.avatarURL;
    }

    // Check if there are changes and validation passed
    if (Object.keys(payload).length === 0 && valid) {
      return alert("No changes to save");
    }
    if (!valid) {
      return;
    }

    // Disable + feedback
    btnAcct.disabled = true;
    txtAcct.textContent = "Saving…";
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 400) {
        const err = await res.json();
        showError(errName, err.error || "Invalid data");
      } else if (res.status === 409) {
        const err = await res.json();
        showError(errName, err.error || "Username or email already in use");
      } else if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Unexpected error");
      } else {
        const updated = (await res.json()) as UserProfile;

        // Update profile object and UI with fresh data from server
        if (updated.userName) {
          profile.userName = updated.userName;
          usernameInput.value = updated.userName;
        }
        if (updated.email !== undefined) {
          profile.email = updated.email;
          emailInput.value = updated.email;
        }
        if (updated.avatarURL) {
          profile.avatarURL = updated.avatarURL;
          profileImg.src = updated.avatarURL;
        }

        alert("Account settings saved successfully");
      }
    } catch (err: any) {
      console.error("Error saving account settings:", err);
      alert("Unable to contact server. Please try again.");
    } finally {
      btnAcct.disabled = false;
      txtAcct.textContent = "Save";
    }
  });
}

/**
 * Setup Gameplay settings: load/store from localStorage, bind palette and controls.
 */
function bindGameplaySection(container: HTMLElement) {
  // Fetch form and controls
  const form = container.querySelector<HTMLFormElement>("#form-gameplay")!;
  const settings = loadGameplaySettings();

  const difficultySel = form.elements.namedItem(
    "difficulty"
  ) as HTMLSelectElement;
  const colorThemeSel = form.elements.namedItem(
    "colorTheme"
  ) as HTMLSelectElement;
  const ballColorInput = form.elements.namedItem(
    "ballColor"
  ) as HTMLInputElement;
  const paddleColorInput = form.elements.namedItem(
    "paddleColor"
  ) as HTMLInputElement;
  const glowRange = form.elements.namedItem(
    "glowIntensity"
  ) as HTMLInputElement;
  const trailRange = form.elements.namedItem("trailLength") as HTMLInputElement;
  const bgColorInput = form.elements.namedItem("bgColor") as HTMLInputElement;
  const bgOpacityRange = form.elements.namedItem(
    "bgOpacity"
  ) as HTMLInputElement;
  const p1UpInput = form.querySelector<HTMLInputElement>('[name="p1UpKey"]')!;
  const p1DownInput =
    form.querySelector<HTMLInputElement>('[name="p1DownKey"]')!;
  const p2UpInput = form.querySelector<HTMLInputElement>('[name="p2UpKey"]')!;
  const p2DownInput =
    form.querySelector<HTMLInputElement>('[name="p2DownKey"]')!;

  // Pre-fill stored settings
  Object.assign(difficultySel, { value: settings.difficulty });
  Object.assign(colorThemeSel, { value: settings.colorTheme });
  ballColorInput.value = settings.ballColor;
  paddleColorInput.value = settings.paddleColor;
  glowRange.value = String(settings.glowIntensity);
  trailRange.value = String(settings.trailLength);
  bgColorInput.value = settings.bgColor;
  bgOpacityRange.value = String(settings.bgOpacity);

  // For keybind inputs, show visual display but store real values in data attribute
  p1UpInput.value = getKeyDisplayName(settings.p1UpKey);
  p1UpInput.setAttribute('data-real-key', settings.p1UpKey);
  p1DownInput.value = getKeyDisplayName(settings.p1DownKey);
  p1DownInput.setAttribute('data-real-key', settings.p1DownKey);
  p2UpInput.value = getKeyDisplayName(settings.p2UpKey);
  p2UpInput.setAttribute('data-real-key', settings.p2UpKey);
  p2DownInput.value = getKeyDisplayName(settings.p2DownKey);
  p2DownInput.setAttribute('data-real-key', settings.p2DownKey);

  // Bind color theme change: sync palette
  colorThemeSel.addEventListener("change", () =>
    applyPalette(colorThemeSel.value as keyof typeof palettes, settings, {
      ballColorInput,
      paddleColorInput,
      glowRange,
      trailRange,
      bgColorInput,
      bgOpacityRange,
    })
  );

  // Bind key capture for custom binds
  [
    [p1UpInput, "p1UpKey"],
    [p1DownInput, "p1DownKey"],
    [p2UpInput, "p2UpKey"],
    [p2DownInput, "p2DownKey"],
  ].forEach(([input, prop]) =>
    bindKeyCapture(
      input as HTMLInputElement,
      prop as keyof GameplaySettings,
      settings
    )
  );

  // Form submission: save to localStorage
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    settings.difficulty = difficultySel.value as any;
    settings.colorTheme = colorThemeSel.value as any;
    settings.ballColor = ballColorInput.value;
    settings.paddleColor = paddleColorInput.value;
    settings.glowIntensity = Number(glowRange.value);
    settings.trailLength = Number(trailRange.value);
    settings.bgColor = bgColorInput.value;
    settings.bgOpacity = Number(bgOpacityRange.value);

    // Use real key values from data attributes instead of display values
    settings.p1UpKey = p1UpInput.getAttribute('data-real-key') || settings.p1UpKey;
    settings.p1DownKey = p1DownInput.getAttribute('data-real-key') || settings.p1DownKey;
    settings.p2UpKey = p2UpInput.getAttribute('data-real-key') || settings.p2UpKey;
    settings.p2DownKey = p2DownInput.getAttribute('data-real-key') || settings.p2DownKey;

    saveGameplaySettings(settings);
    alert("Gameplay settings saved");
  });
}

/**
 * Apply a preset palette to the form inputs and settings object.
 */
function applyPalette(
  theme: keyof typeof palettes,
  settings: GameplaySettings,
  inputs: {
    ballColorInput: HTMLInputElement;
    paddleColorInput: HTMLInputElement;
    glowRange: HTMLInputElement;
    trailRange: HTMLInputElement;
    bgColorInput: HTMLInputElement;
    bgOpacityRange: HTMLInputElement;
  }
) {
  const p = palettes[theme];
  inputs.ballColorInput.value = p.ballColor;
  inputs.paddleColorInput.value = p.paddleColor;
  inputs.glowRange.value = String(p.glowIntensity);
  inputs.trailRange.value = String(p.trailLength);
  inputs.bgColorInput.value = p.bgColor;
  inputs.bgOpacityRange.value = String(p.bgOpacity);
  Object.assign(settings, { colorTheme: theme, ...p });
}

// State management for keybind isolation
let isKeybindActive = false;
let activeKeybindInput: HTMLInputElement | null = null;
let keybindOverlay: HTMLElement | null = null;

/**
 * Capture any key press into a readonly input and store in settings.
 * Provides visual isolation and prevents interference from other UI.
 */
function bindKeyCapture(
  input: HTMLInputElement,
  prop: keyof GameplaySettings,
  settings: GameplaySettings
) {
  input.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startKeybindCapture(input, prop, settings);
  });

  input.addEventListener("focus", (e) => {
    e.preventDefault();
    input.blur(); // Prevent focus, use click instead
  });
}

/**
 * Start keybind capture mode with visual isolation
 */
function startKeybindCapture(
  input: HTMLInputElement,
  prop: keyof GameplaySettings,
  settings: GameplaySettings
) {
  // Prevent multiple keybind captures
  if (isKeybindActive) {
    cancelKeybindCapture();
  }

  isKeybindActive = true;
  activeKeybindInput = input;

  // Show the modal
  createKeybindOverlay(input);

  // Get modal elements
  const modal = document.querySelector("#keybind-modal");
  const targetDisplay = modal?.querySelector("#keybind-target");
  const keyDisplay = modal?.querySelector("#keybind-display");
  const confirmBtn = modal?.querySelector("#keybind-confirm") as HTMLButtonElement;
  const closeBtn = modal?.querySelector("#keybind-close") as HTMLButtonElement;

  // Set up modal display
  if (targetDisplay) {
    const inputName = input.getAttribute("data-key") || prop.toString();
    targetDisplay.textContent = inputName;
  }

  if (keyDisplay) {
    keyDisplay.textContent = "Press any key";
  }

  // Show confirm button from the start (no longer hidden)
  confirmBtn?.classList.remove("hidden");

  // Store original value for cancellation
  const originalValue = input.value;
  let capturedKey: string | null = null;
  let capturedRawKey: string | null = null; // Store the raw key for settings

  // Key capture handler
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Allow Escape to cancel
    if (e.key === "Escape") {
      cancelKeybindCapture(originalValue);
      return;
    }

    // Capture both raw key (for storage) and normalized key
    capturedRawKey = e.key;
    capturedKey = normalizeKeyName(e.key);

    // Update displays with visual representation
    if (keyDisplay) {
      keyDisplay.textContent = getKeyDisplayName(e.key);
    }
  };

  // Confirm button handler
  const onConfirm = () => {
    if (capturedKey && capturedRawKey) {
      // Display visual version in input
      input.value = getKeyDisplayName(capturedRawKey);
      // Store real key value in data attribute for form submission
      input.setAttribute('data-real-key', capturedKey);
      // Store normalized key value for game compatibility
      // @ts-ignore
      settings[prop] = capturedKey;
      completeKeybindCapture();
    }
  };

  // Close button handler (same as cancel)
  const onClose = () => {
    cancelKeybindCapture(originalValue);
  };

  // Click outside handler to cancel
  const onClickOutside = (e: MouseEvent) => {
    const modalContent = modal?.querySelector(".animate-scaleIn");
    if (modal && !modalContent?.contains(e.target as Node)) {
      cancelKeybindCapture(originalValue);
    }
  };

  // Bind events
  window.addEventListener("keydown", onKey, { capture: true });
  confirmBtn?.addEventListener("click", onConfirm);
  closeBtn?.addEventListener("click", onClose);
  setTimeout(() => {
    document.addEventListener("click", onClickOutside, { capture: true });
  }, 100); // Small delay to prevent immediate cancellation

  // Store cleanup functions
  (input as any)._keybindCleanup = () => {
    window.removeEventListener("keydown", onKey, { capture: true });
    document.removeEventListener("click", onClickOutside, { capture: true });
    confirmBtn?.removeEventListener("click", onConfirm);
    closeBtn?.removeEventListener("click", onClose);
  };
}

/**
 * Show the keybind modal from the template
 */
function createKeybindOverlay(input: HTMLInputElement) {
  keybindOverlay = document.querySelector("#keybind-modal");
  if (!keybindOverlay) {
    console.error("Keybind modal not found in template");
    return;
  }

  // Show the modal
  keybindOverlay.classList.remove("hidden");

  // Clear any previous error
  const errorElement = keybindOverlay.querySelector("#error-keybind-modal");
  if (errorElement) {
    errorElement.classList.add("hidden");
    errorElement.textContent = "";
  }
}

/**
 * Complete keybind capture and cleanup
 */
function completeKeybindCapture() {
  if (!activeKeybindInput) return;

  // Cleanup visual states
  activeKeybindInput.classList.remove("animate-pulse", "border-yellow-400", "bg-yellow-900/30");
  activeKeybindInput.classList.add("border-green-400", "bg-green-900/30");

  // Brief success feedback
  setTimeout(() => {
    if (activeKeybindInput) {
      activeKeybindInput.classList.remove("border-green-400", "bg-green-900/30");
    }
  }, 1000);

  cleanupKeybindCapture();
}

/**
 * Cancel keybind capture and restore original value
 */
function cancelKeybindCapture(originalValue?: string) {
  if (!activeKeybindInput) return;

  // Restore original value if provided
  if (originalValue !== undefined) {
    activeKeybindInput.value = originalValue;
  }

  // Cleanup visual states
  activeKeybindInput.classList.remove(
    "animate-pulse", "border-yellow-400", "bg-yellow-900/30",
    "border-green-400", "bg-green-900/30"
  );

  cleanupKeybindCapture();
}

/**
 * Common cleanup for keybind capture
 */
function cleanupKeybindCapture() {
  // Remove event listeners
  if (activeKeybindInput && (activeKeybindInput as any)._keybindCleanup) {
    (activeKeybindInput as any)._keybindCleanup();
    delete (activeKeybindInput as any)._keybindCleanup;
  }

  // Hide the modal
  if (keybindOverlay) {
    keybindOverlay.classList.add("hidden");
    keybindOverlay = null;
  }

  // Reset state
  isKeybindActive = false;
  activeKeybindInput = null;
}

/**
 * Get visual display for a key (for UI only)
 */
function getKeyDisplayName(key: string): string {
  const displayMap: Record<string, string> = {
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    "arrowup": "↑",
    "arrowdown": "↓",
    "arrowleft": "←",
    "arrowright": "→",
    " ": "Space",
    "space": "Space",
    "Control": "Ctrl",
    "control": "Ctrl",
    "Alt": "Alt",
    "alt": "Alt",
    "Shift": "Shift",
    "shift": "Shift",
    "Meta": "Cmd",
    "meta": "Cmd",
    "Tab": "Tab",
    "tab": "Tab",
    "Enter": "Enter",
    "enter": "Enter",
    "Backspace": "Backspace",
    "backspace": "Backspace",
    "Delete": "Delete",
    "delete": "Delete",
    "Escape": "Escape",
    "escape": "Escape"
  };

  return displayMap[key] || key.toUpperCase();
}

/**
 * Normalize key names for storage (keeps game compatibility)
 */
function normalizeKeyName(key: string): string {
  // For game compatibility, we need to match exactly what e.key.toLowerCase() produces
  // The game controller uses e.key.toLowerCase() for comparison
  return key.toLowerCase();
}

/**
 * Bind the security form to perform a PUT with passwords and 2FA toggle.
 */
async function bindSecuritySection(container: HTMLElement) {
  // Fetch current 2FA status from API
  const userData = await fetchUserProfile();
  let initialTwoFactor = userData?.isTotpEnabled || false;
  // Buttons to toggle between password and 2FA forms
  const btnPw = container.querySelector<HTMLButtonElement>(
    "#btn-change-password"
  )!;
  const btn2F = container.querySelector<HTMLButtonElement>("#btn-change-2fa")!;
  const formPw = container.querySelector<HTMLFormElement>("#form-password")!;
  const form2F = container.querySelector<HTMLFormElement>("#form-2fa")!;

  // Password form elements
  const errCurrPw =
    container.querySelector<HTMLParagraphElement>("#error-current-pw")!;
  const errNewPw =
    container.querySelector<HTMLParagraphElement>("#error-new-pw")!;
  const errConfirmPw =
    container.querySelector<HTMLParagraphElement>("#error-confirm-pw")!;
  const btnPwSubmit =
    container.querySelector<HTMLButtonElement>("#passwordSubmitBtn")!;
  const txtPw = container.querySelector<HTMLSpanElement>(
    "#passwordSubmitText"
  )!;

  // 2FA form elements
  const errCurr2FA =
    container.querySelector<HTMLParagraphElement>("#error-current-2fa")!;
  const btn2FSubmit =
    container.querySelector<HTMLButtonElement>("#twoSubmitBtn")!;
  const txt2F = container.querySelector<HTMLSpanElement>("#twofaSubmitText")!;

  // Track initial 2FA state from API
  const twoFactorInput =
    form2F.querySelector<HTMLInputElement>("#twoFactorCheckbox")!;

  // Set checkbox to match the fetched state
  twoFactorInput.checked = initialTwoFactor;

  // Setup password visibility toggles
  setupPasswordToggle(container);

  // Toggle forms
  btnPw.addEventListener("click", () => {
    form2F.classList.add("hidden");
    formPw.classList.remove("hidden");
  });
  btn2F.addEventListener("click", () => {
    formPw.classList.add("hidden");
    form2F.classList.remove("hidden");
  });

  // Password form submission
  formPw.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetErrors(errCurrPw, errNewPw, errConfirmPw);
    const fm = formPw.elements as any;
    const currentPassword = fm.currentPassword.value.trim();
    const newPassword = fm.newPassword.value;
    const confirmPassword = fm.confirmPassword.value;

    let valid = true;
    if (!currentPassword) {
      showError(errCurrPw, "Current password is required");
      valid = false;
    }
    if (!newPassword || newPassword.length < 8) {
      showError(errNewPw, "New password must be at least 8 characters");
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      showError(errConfirmPw, "Passwords do not match");
      valid = false;
    }
    if (!valid) return;

    btnPwSubmit.disabled = true;
    txtPw.textContent = "Saving…";
    try {
      const res = await fetch("/api/security", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 400) {
        const err = await res.json();
        const errorMessage = err.error || "Invalid request";
        // Detect which field the error is about based on the error message
        if (errorMessage.toLowerCase().includes("current password")) {
          showError(errCurrPw, errorMessage);
        } else if (errorMessage.toLowerCase().includes("new password")) {
          showError(errNewPw, errorMessage);
        } else {
          // Default to current password field for unknown errors
          showError(errCurrPw, errorMessage);
        }
      } else if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Unexpected error");
      } else {
        alert("Password updated");
        formPw.reset();
      }
    } catch {
      alert("Unable to contact server");
    } finally {
      btnPwSubmit.disabled = false;
      txtPw.textContent = "Save Password";
    }
  });

  // 2FA form submission
  form2F.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetErrors(errCurr2FA);
    const fm = form2F.elements as any;
    const currentPassword = fm.currentPassword.value.trim();
    const twoFactor = fm.twoFactor.checked;

    if (!currentPassword) {
      showError(errCurr2FA, "Current password is required");
      return;
    }
    const change2FA = twoFactor !== initialTwoFactor;

    if (!change2FA) {
      showError(errCurr2FA, "No change in 2FA state");
      return;
    }

    btn2FSubmit.disabled = true;
    txt2F.textContent = "Saving…";
    try {
      console.log("📡 Envoi de la requête POST /api/2fa...");
      const res = await fetch("/api/2fa", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: currentPassword,
          enable2fa: twoFactor,
        }),
      });

      if (res.status === 401) {
        const err = await res.json();
        if (err.error?.includes("2FA has been disabled")) {
          // 2FA was disabled successfully, user needs to log in again
          alert("2FA has been disabled. You will be redirected to login.");
          window.location.href = "/"; // Redirect to login
          return;
        } else {
          // Invalid password
          showError(errCurr2FA, err.error || "Invalid current password");
        }
      } else if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Unexpected error");
      } else {
        // Success - 2FA was enabled, QR code generated
        const data = await res.json();
        if (data.qrDataUrl) {
          // Show QR code and verification form
          await show2FASetupModal(data.qrDataUrl, (success) => {
            if (success) {
              // 2FA setup completed successfully
              initialTwoFactor = true;
              twoFactorInput.checked = true;
              alert(
                "2FA has been successfully enabled! You will be redirected to login."
              );
              window.location.href = "/"; // Redirect to login
              return;
            } else {
              // User cancelled or failed verification
              twoFactorInput.checked = initialTwoFactor;
            }
            form2F.reset();
            twoFactorInput.checked = initialTwoFactor;
          });
        }
      }
    } catch {
      alert("Unable to contact server");
    } finally {
      btn2FSubmit.disabled = false;
      txt2F.textContent = "Save 2FA";
    }
  });
}

/**
 * Setup tab navigation between Account, Gameplay, Security.
 */
function bindTabNavigation(container: HTMLElement) {
  type TabName = "account" | "gameplay" | "security";
  let current: TabName = "account";
  const nav = container.querySelector<HTMLElement>('nav[aria-label="Tabs"]')!;
  // Activate default
  container
    .querySelector(`button[data-tab="${current}"]`)!
    .classList.add("border-pink-500", "text-white");
  container.querySelector(`#tab-${current}`)!.classList.remove("hidden");

  nav.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      "button[data-tab]"
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const tab = btn.dataset.tab as TabName;
    if (tab === current) return;
    // Deactivate old
    container
      .querySelector(`button[data-tab="${current}"]`)!
      .classList.remove("border-pink-500", "text-white");
    container.querySelector(`#tab-${current}`)!.classList.add("hidden");
    // Activate new
    btn.classList.add("border-pink-500", "text-white");
    container.querySelector(`#tab-${tab}`)!.classList.remove("hidden");
    current = tab;
  });
}

function resetErrors(...els: HTMLElement[]) {
  els.forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
}

function showError(el: HTMLElement, message: string) {
  el.textContent = message;
  el.classList.remove("hidden");
}

// Helper function to handle file upload
async function handleFileUpload(file: File): Promise<string> {
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG and WebP images are allowed");
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error("Image must be smaller than 2MB");
  }

  // Convert to Base64 for database storage (current approach)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Check final Base64 size (should be ~33% larger than original)
      if (result.length > maxSize * 1.5) {
        reject(new Error("Processed image is too large"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Helper function to show 2FA setup modal with QR code and verification
async function show2FASetupModal(
  qrDataUrl: string,
  callback: (success: boolean) => void
): Promise<void> {
  return new Promise((resolve) => {
    // Get the existing modal from the template
    const modal = document.querySelector<HTMLDivElement>("#twofa-modal")!;
    const qrImg = modal.querySelector<HTMLImageElement>("#twofa-qr")!;
    const closeBtn = modal.querySelector<HTMLButtonElement>("#twofa-close")!;
    const codeInputs =
      modal.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const errorEl =
      modal.querySelector<HTMLParagraphElement>("#error-2fa-modal")!;

    // Set the QR code
    qrImg.src = qrDataUrl;

    // Show modal
    modal.classList.remove("hidden");

    // Focus first input
    if (codeInputs.length > 0) {
      codeInputs[0].focus();
    }

    // Handle input navigation between code fields
    codeInputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        // Clear error when user starts typing
        clearError();

        // Only allow digits
        target.value = target.value.replace(/\D/g, "");

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

      input.addEventListener("keydown", (e) => {
        // Move to previous input on backspace
        if (e.key === "Backspace" && !input.value && index > 0) {
          codeInputs[index - 1].focus();
        }
      });
    });

    // Get complete code from all inputs
    const getCode = (): string => {
      return Array.from(codeInputs)
        .map((input) => input.value)
        .join("");
    };

    // Clear all inputs
    const clearInputs = () => {
      codeInputs.forEach((input) => (input.value = ""));
    };

    // Clear inputs and error
    const clearAll = () => {
      clearInputs();
      clearError();
    };

    // Show error (using the error element in the template)
    const showError = (message: string) => {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    };

    // Clear error
    const clearError = () => {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
    };

    // Handle verify button click
    const handleVerify = async () => {
      const code = getCode();
      clearError(); // Clear any previous errors

      if (code.length !== 6) {
        showError("Please enter a complete 6-digit code");
        return;
      }

      try {
        const res = await fetch("/api/2fa/verify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code }),
        });

        if (res.ok) {
          // Success
          cleanup();
          callback(true);
          resolve();
        } else {
          const err = await res.json();
          showError(err.error || "Invalid code. Please try again.");
          // Clear inputs but keep the error message
          codeInputs.forEach((input) => (input.value = ""));
          if (codeInputs.length > 0) {
            codeInputs[0].focus();
          }
        }
      } catch {
        showError("Unable to contact server. Please try again.");
      }
    };

    // Handle cancel/close
    const handleCancel = () => {
      cleanup();
      callback(false);
      resolve();
    };

    // Helper to cleanup modal
    const cleanup = () => {
      modal.classList.add("hidden");
      clearAll();
      qrImg.src = ""; // Reset QR code
    };

    // Event listeners
    closeBtn.addEventListener("click", handleCancel);

    // Handle Enter key in any input
    codeInputs.forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          handleVerify();
        }
      });
    });

    // Handle Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", escapeHandler);
        handleCancel();
      }
    };
    document.addEventListener("keydown", escapeHandler);

    // Handle click outside modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    });
  });
}

/**
 * Setup password visibility toggle functionality
 */
function setupPasswordToggle(container: HTMLElement) {
  // Find all password input fields with toggle icons
  const passwordInputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]');

  passwordInputs.forEach(input => {
    // Find the eye icon in the same parent container
    const parentDiv = input.closest('.relative');
    const eyeIcon = parentDiv?.querySelector<HTMLElement>('.bx-eye-slash, .bx-eye');

    if (eyeIcon) {
      eyeIcon.addEventListener('click', () => {
        togglePasswordVisibility(input, eyeIcon);
      });
    }
  });
}

/**
 * Toggle password visibility for a specific input
 */
function togglePasswordVisibility(input: HTMLInputElement, icon: HTMLElement) {
  if (input.type === 'password') {
    // Show password
    input.type = 'text';
    icon.classList.remove('bx-eye-slash');
    icon.classList.add('bx-eye');
  } else {
    // Hide password
    input.type = 'password';
    icon.classList.remove('bx-eye');
    icon.classList.add('bx-eye-slash');
  }
}
