import { settingsTemplate } from "../templates/settingsTemplate.js";
export const defaultGameplaySettings = {
    difficulty: 'Normal',
    colorTheme: 'Vaporwave',
    ballColor: '#ff00aa',
    paddleColor: '#00f0ff',
    glowIntensity: 0,
    trailLength: 0,
    bgColor: '#000000',
    bgOpacity: 70,
    p1UpKey: 'w',
    p1DownKey: 's',
    p2UpKey: 'arrowup',
    p2DownKey: 'arrowdown',
};
export function loadGameplaySettings() {
    const raw = localStorage.getItem('gameplaySettings');
    if (raw) {
        try {
            return JSON.parse(raw);
        }
        catch { /* ignore parse errors */ }
    }
    localStorage.setItem('gameplaySettings', JSON.stringify(defaultGameplaySettings));
    return defaultGameplaySettings;
}
export function saveGameplaySettings(s) {
    localStorage.setItem('gameplaySettings', JSON.stringify(s));
}
const palettes = {
    Vaporwave: { ballColor: '#ff77aa', paddleColor: '#77ccff', bgColor: '#1a0033', glowIntensity: 0, trailLength: 0, bgOpacity: 70 },
    Cyberpunk: { ballColor: '#ff00ff', paddleColor: '#00ffff', bgColor: '#0a0a0a', glowIntensity: 15, trailLength: 10, bgOpacity: 90 },
    Retro: { ballColor: '#ffff00', paddleColor: '#00ff00', bgColor: '#0000aa', glowIntensity: 5, trailLength: 5, bgOpacity: 80 },
    Monochrome: { ballColor: '#ffffff', paddleColor: '#888888', bgColor: '#000000', glowIntensity: 0, trailLength: 2, bgOpacity: 100 },
};
export function renderSettings(container, onBack) {
    container.innerHTML = settingsTemplate;
    bindBackButton(container, onBack);
    bindAccountSection(container);
    bindGameplaySection(container);
    bindSecuritySection(container);
    bindTabNavigation(container);
}
/**
 * Bind the back button in the top-right corner.
 */
function bindBackButton(container, onBack) {
    const backBtn = container.querySelector("#backBtn");
    backBtn.addEventListener('click', onBack);
}
/**
 * Setup Account settings: profile info, avatar picker, form submission.
 */
function bindAccountSection(container) {
    // Load stored profile from localStorage
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('email');
    const storedAvatar = localStorage.getItem('avatarURL');
    const profile = {};
    if (storedName)
        profile.userName = storedName;
    if (storedEmail)
        profile.email = storedEmail;
    if (storedAvatar)
        profile.avatarURL = storedAvatar;
    // Keep track of the original avatar to detect changes
    const originalAvatarURL = storedAvatar;
    // Selectors
    const profileImg = container.querySelector('#profile-img');
    const modal = container.querySelector('#avatar-selector');
    const fileInput = container.querySelector('#avatar-file-input');
    const usernameInput = container.querySelector('#username-input');
    const emailInput = container.querySelector('#email-input');
    const formAccount = container.querySelector('#form-account');
    const errName = container.querySelector('#error-username');
    const errEmail = container.querySelector('#error-email');
    const btnAcct = container.querySelector('#accountSubmitBtn');
    const txtAcct = container.querySelector('#accountSubmitText');
    // Initialize fields
    if (profile.avatarURL)
        profileImg.src = profile.avatarURL;
    if (profile.userName)
        usernameInput.value = profile.userName;
    if (profile.email)
        emailInput.value = profile.email;
    // Avatar modal open
    profileImg.addEventListener('click', () => modal.classList.remove('hidden'));
    // Predefined avatars
    modal.querySelectorAll('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            const url = img.dataset.src;
            profile.avatarURL = url;
            profileImg.src = url;
            modal.classList.add('hidden');
        });
    });
    // Import custom avatar
    container.querySelector('#avatar-import')
        .addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file)
            return;
        const url = URL.createObjectURL(file);
        profile.avatarURL = url;
        profileImg.src = url;
        modal.classList.add('hidden');
    });
    // Account form submission (PUT /api/settings/account)
    formAccount.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors(errName, errEmail);
        let valid = true;
        const payload = {};
        const newName = usernameInput.value.trim();
        const newEmail = emailInput.value.trim();
        if (newName !== profile.userName) {
            if (newName)
                payload.userName = newName;
            if (!usernameInput.value.trim()) {
                showError(errName, 'Username is required');
                valid = false;
            }
        }
        if (newEmail && newEmail !== profile.email) {
            payload.email = newEmail;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                showError(errEmail, 'Invalid email address');
                valid = false;
            }
        }
        if (profile.avatarURL && profile.avatarURL !== originalAvatarURL)
            payload.avatarURL = profile.avatarURL;
        if (Object.keys(payload).length === 0 && valid)
            return alert('No changes');
        if (!valid)
            return;
        // Disable + feedback
        btnAcct.disabled = true;
        txtAcct.textContent = 'Saving…';
        try {
            const res = await fetch('/api/settings/account', {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.status === 400) {
                const err = await res.json();
                showError(errName, err.error || 'Invalid data');
            }
            else if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Unexpected error');
            }
            else {
                const updated = await res.json();
                // Update localStorage and UI
                if (updated.userName) {
                    localStorage.setItem('userName', updated.userName);
                    usernameInput.value = updated.userName;
                }
                if (updated.email) {
                    localStorage.setItem('email', updated.email);
                    emailInput.value = updated.email;
                }
                if (updated.avatarURL) {
                    localStorage.setItem('avatarURL', updated.avatarURL);
                    profileImg.src = updated.avatarURL;
                }
                alert('Account settings saved');
            }
        }
        catch (err) {
            alert(err.message);
        }
        finally {
            btnAcct.disabled = false;
            btnAcct.textContent = 'Save';
        }
    });
}
/**
 * Setup Gameplay settings: load/store from localStorage, bind palette and controls.
 */
function bindGameplaySection(container) {
    // Fetch form and controls
    const form = container.querySelector('#form-gameplay');
    const settings = loadGameplaySettings();
    const difficultySel = form.elements.namedItem('difficulty');
    const colorThemeSel = form.elements.namedItem('colorTheme');
    const ballColorInput = form.elements.namedItem('ballColor');
    const paddleColorInput = form.elements.namedItem('paddleColor');
    const glowRange = form.elements.namedItem('glowIntensity');
    const trailRange = form.elements.namedItem('trailLength');
    const bgColorInput = form.elements.namedItem('bgColor');
    const bgOpacityRange = form.elements.namedItem('bgOpacity');
    const p1UpInput = form.querySelector('[name="p1UpKey"]');
    const p1DownInput = form.querySelector('[name="p1DownKey"]');
    const p2UpInput = form.querySelector('[name="p2UpKey"]');
    const p2DownInput = form.querySelector('[name="p2DownKey"]');
    // Pre-fill stored settings
    Object.assign(difficultySel, { value: settings.difficulty });
    Object.assign(colorThemeSel, { value: settings.colorTheme });
    ballColorInput.value = settings.ballColor;
    paddleColorInput.value = settings.paddleColor;
    glowRange.value = String(settings.glowIntensity);
    trailRange.value = String(settings.trailLength);
    bgColorInput.value = settings.bgColor;
    bgOpacityRange.value = String(settings.bgOpacity);
    p1UpInput.value = settings.p1UpKey;
    p1DownInput.value = settings.p1DownKey;
    p2UpInput.value = settings.p2UpKey;
    p2DownInput.value = settings.p2DownKey;
    // Bind color theme change: sync palette
    colorThemeSel.addEventListener('change', () => applyPalette(colorThemeSel.value, settings, {
        ballColorInput, paddleColorInput, glowRange, trailRange, bgColorInput, bgOpacityRange
    }));
    // Bind key capture for custom binds
    [[p1UpInput, 'p1UpKey'], [p1DownInput, 'p1DownKey'], [p2UpInput, 'p2UpKey'], [p2DownInput, 'p2DownKey']]
        .forEach(([input, prop]) => bindKeyCapture(input, prop, settings));
    // Form submission: save to localStorage
    form.addEventListener('submit', e => {
        e.preventDefault();
        settings.difficulty = difficultySel.value;
        settings.colorTheme = colorThemeSel.value;
        settings.ballColor = ballColorInput.value;
        settings.paddleColor = paddleColorInput.value;
        settings.glowIntensity = Number(glowRange.value);
        settings.trailLength = Number(trailRange.value);
        settings.bgColor = bgColorInput.value;
        settings.bgOpacity = Number(bgOpacityRange.value);
        settings.p1UpKey = p1UpInput.value;
        settings.p1DownKey = p1DownInput.value;
        settings.p2UpKey = p2UpInput.value;
        settings.p2DownKey = p2DownInput.value;
        saveGameplaySettings(settings);
        alert('Gameplay settings saved');
    });
}
/**
 * Apply a preset palette to the form inputs and settings object.
 */
function applyPalette(theme, settings, inputs) {
    const p = palettes[theme];
    inputs.ballColorInput.value = p.ballColor;
    inputs.paddleColorInput.value = p.paddleColor;
    inputs.glowRange.value = String(p.glowIntensity);
    inputs.trailRange.value = String(p.trailLength);
    inputs.bgColorInput.value = p.bgColor;
    inputs.bgOpacityRange.value = String(p.bgOpacity);
    Object.assign(settings, { colorTheme: theme, ...p });
}
/**
 * Capture any key press into a readonly input and store in settings.
 */
function bindKeyCapture(input, prop, settings) {
    input.addEventListener('focus', () => {
        input.value = '…';
        const onKey = (e) => {
            e.preventDefault();
            input.value = e.key;
            // @ts-ignore
            settings[prop] = e.key;
            window.removeEventListener('keydown', onKey);
            input.blur();
        };
        window.addEventListener('keydown', onKey);
    });
}
/**
 * Bind the security form to perform a PUT with passwords and 2FA toggle.
 */
function bindSecuritySection(container) {
    const form = container.querySelector('#form-security');
    const errCurr = container.querySelector('#error-current');
    const errNew = container.querySelector('#error-new');
    const btnSec = container.querySelector('#securitySubmitBtn');
    const txtSec = container.querySelector('#securitySubmitText');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors(errCurr, errNew);
        const fm = form.elements;
        const currentPassword = fm.currentPassword.value.trim();
        const newPassword = fm.newPassword.value;
        const twoFactor = fm.twoFactor.checked;
        // Front-end validation
        let valid = true;
        if (!currentPassword) {
            showError(errCurr, 'Current password is required');
            valid = false;
        }
        // Only validate new password if user wants to change it
        if (newPassword && newPassword.length < 8) {
            showError(errNew, 'New password must be at least 8 characters');
            valid = false;
        }
        if (!valid)
            return;
        //  Disable button and show feedback
        btnSec.disabled = true;
        txtSec.textContent = 'Saving…';
        //  Build payload: always include twoFactor, newPassword only if set
        const payload = { currentPassword, twoFactor };
        if (newPassword)
            payload.newPassword = newPassword;
        try {
            const res = await fetch('/api/settings/security', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.status === 400) {
                const err = await res.json();
                showError(errCurr, err.error || 'Invalid current password');
            }
            else if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Unexpected error');
            }
            else {
                alert('Security settings updated');
            }
        }
        catch (err) {
            alert(err.message || 'Unable to contact server');
        }
        finally {
            btnSec.disabled = false;
            txtSec.textContent = 'Save Security';
        }
    });
}
/**
 * Setup tab navigation between Account, Gameplay, Security.
 */
function bindTabNavigation(container) {
    let current = 'account';
    const nav = container.querySelector('nav[aria-label="Tabs"]');
    // Activate default
    container.querySelector(`button[data-tab="${current}"]`).classList.add('border-pink-500', 'text-white');
    container.querySelector(`#tab-${current}`).classList.remove('hidden');
    nav.addEventListener('click', e => {
        const btn = e.target.closest('button[data-tab]');
        if (!btn)
            return;
        const tab = btn.dataset.tab;
        if (tab === current)
            return;
        // Deactivate old
        container.querySelector(`button[data-tab="${current}"]`).classList.remove('border-pink-500', 'text-white');
        container.querySelector(`#tab-${current}`).classList.add('hidden');
        // Activate new
        btn.classList.add('border-pink-500', 'text-white');
        container.querySelector(`#tab-${tab}`).classList.remove('hidden');
        current = tab;
    });
}
function resetErrors(...els) {
    els.forEach(el => {
        el.textContent = "";
        el.classList.add("hidden");
    });
}
function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
}
//# sourceMappingURL=settingsController.js.map