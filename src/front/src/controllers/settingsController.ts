import { settingsTemplate } from "../templates/settingsTemplate.js";

type TabName = 'account' | 'gameplay' | 'security';

interface UserProfile {
    userName: string;
    email: string;
    avatarURL?: string;
}

export interface GameplaySettings {
    difficulty: 'Easy' | 'Normal' | 'Hard';
    colorTheme: 'Vaporwave' | 'Cyberpunk' | 'Retro' | 'Monochrome';
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

export function loadGameplaySettings(): GameplaySettings {
    const raw = localStorage.getItem('gameplaySettings');
    if (raw) {
        try { return JSON.parse(raw) as GameplaySettings; }
        catch { /* ignore parse errors */ }
    }
    localStorage.setItem('gameplaySettings', JSON.stringify(defaultGameplaySettings));
    return defaultGameplaySettings;
}

export function saveGameplaySettings(s: GameplaySettings) {
    localStorage.setItem('gameplaySettings', JSON.stringify(s));
}

const palettes = {
    Vaporwave: { ballColor: '#ff77aa', paddleColor: '#77ccff', bgColor: '#1a0033', glowIntensity: 0, trailLength: 0, bgOpacity: 70 },
    Cyberpunk: { ballColor: '#ff00ff', paddleColor: '#00ffff', bgColor: '#0a0a0a', glowIntensity: 15, trailLength: 10, bgOpacity: 90 },
    Retro: { ballColor: '#ffff00', paddleColor: '#00ff00', bgColor: '#0000aa', glowIntensity: 5, trailLength: 5, bgOpacity: 80 },
    Monochrome: { ballColor: '#ffffff', paddleColor: '#888888', bgColor: '#000000', glowIntensity: 0, trailLength: 2, bgOpacity: 100 },
} as const;



export function renderSettings(container: HTMLElement, onBack: () => void) {
    container.innerHTML = settingsTemplate;

    // Charger profil
    const profile: Partial<UserProfile> = {};
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('email');
    const storedAvatar = localStorage.getItem('avatarURL');
    if (storedName)
        profile.userName = storedName;
    if (storedEmail)
        profile.email = storedEmail;
    if (storedAvatar)
        profile.avatarURL = storedAvatar;

    // Sélecteurs
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
    const profileImg = container.querySelector<HTMLImageElement>('#profile-img')!;
    const modal = container.querySelector<HTMLDivElement>('#avatar-selector')!;
    const fileInput = container.querySelector<HTMLInputElement>('#avatar-file-input')!;
    const usernameInput = container.querySelector<HTMLInputElement>('#username-input')!;
    const emailInput = container.querySelector<HTMLInputElement>('#email-input')!;
    const form = container.querySelector<HTMLFormElement>('#form-account')!;

    // Initialiser champs
    if (profile.avatarURL)
        profileImg.src = profile.avatarURL;
    if (profile.userName)
        usernameInput.value = profile.userName;
    if (profile.email)
        emailInput.value = profile.email;

    // Retour
    backBtn.addEventListener('click', onBack);

    profileImg.addEventListener('click', () => modal.classList.remove('hidden'));

    // Sélection d'une icône existante
    modal.querySelectorAll<HTMLImageElement>('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            const url = img.getAttribute('data-src')!;
            profileImg.src = url;
            profile.avatarURL = url;
            modal.classList.add('hidden');
        });
    });

    const importBtn = container.querySelector<HTMLDivElement>('#avatar-import')!;
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            profileImg.src = url;
            profile.avatarURL = url;
            modal.classList.add('hidden');
        }
    });

    // Soumission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = usernameInput.value.trim();
        const newEmail = emailInput.value.trim();
        const newAvatar = profile.avatarURL || profileImg.src;
        const payload: Partial<UserProfile> = {};
        if (newName && newName !== profile.userName) payload.userName = newName;
        if (newEmail && newEmail !== profile.email) payload.email = newEmail;
        if (newAvatar && newAvatar !== profile.avatarURL) payload.avatarURL = newAvatar;
        if (!Object.keys(payload).length) { alert('No changes'); return; }
        try {
            const res = await fetch('/api/settings/account', {
                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            const updated: UserProfile = await res.json();
            if (updated.userName) localStorage.setItem('userName', updated.userName);
            if (updated.email) localStorage.setItem('email', updated.email);
            if (updated.avatarURL) localStorage.setItem('avatarURL', updated.avatarURL);
            if (updated.avatarURL) profileImg.src = updated.avatarURL;
            if (updated.userName) usernameInput.value = updated.userName;
            if (updated.email) emailInput.value = updated.email;
            Object.assign(profile, updated);
            alert('Saved!');
        } catch {
            alert('Error saving');
        }
    });

    const gameplaySettings = loadGameplaySettings();
    const formGameplay = container.querySelector<HTMLFormElement>('#form-gameplay')!;
    const difficultySel = formGameplay.elements.namedItem('difficulty') as HTMLSelectElement;
    const colorThemeSel = formGameplay.elements.namedItem('colorTheme') as HTMLSelectElement;
    const ballColorInput = formGameplay.elements.namedItem('ballColor') as HTMLInputElement;
    const paddleColorInput = formGameplay.elements.namedItem('paddleColor') as HTMLInputElement;
    const glowRange = formGameplay.elements.namedItem('glowIntensity') as HTMLInputElement;
    const trailRange = formGameplay.elements.namedItem('trailLength') as HTMLInputElement;
    const bgColorInput = formGameplay.elements.namedItem('bgColor') as HTMLInputElement;
    const bgOpacityRange = formGameplay.elements.namedItem('bgOpacity') as HTMLInputElement;
    const p1Up = formGameplay.querySelector<HTMLInputElement>('[name="p1UpKey"]')!;
    const p1Down = formGameplay.querySelector<HTMLInputElement>('[name="p1DownKey"]')!;
    const p2Up = formGameplay.querySelector<HTMLInputElement>('[name="p2UpKey"]')!;
    const p2Down = formGameplay.querySelector<HTMLInputElement>('[name="p2DownKey"]')!;

    difficultySel.value = gameplaySettings.difficulty;
    colorThemeSel.value = gameplaySettings.colorTheme;
    ballColorInput.value = gameplaySettings.ballColor;
    paddleColorInput.value = gameplaySettings.paddleColor;
    glowRange.value = String(gameplaySettings.glowIntensity);
    trailRange.value = String(gameplaySettings.trailLength);
    bgColorInput.value = gameplaySettings.bgColor;
    bgOpacityRange.value = String(gameplaySettings.bgOpacity);
    p1Up.value = gameplaySettings.p1UpKey;
    p1Down.value = gameplaySettings.p1DownKey;
    p2Up.value = gameplaySettings.p2UpKey;
    p2Down.value = gameplaySettings.p2DownKey;


    function bindKeyCapture(input: HTMLInputElement, prop: keyof GameplaySettings) {
        input.addEventListener('focus', () => {
            input.value = '…';
            const onKey = (e: KeyboardEvent) => {
                e.preventDefault();
                input.value = e.key;
                // @ts-ignore
                gameplaySettings[prop] = e.key;
                window.removeEventListener('keydown', onKey);
                input.blur();
            };
            window.addEventListener('keydown', onKey);
        });
    }
    bindKeyCapture(p1Up, 'p1UpKey');
    bindKeyCapture(p1Down, 'p1DownKey');
    bindKeyCapture(p2Up, 'p2UpKey');
    bindKeyCapture(p2Down, 'p2DownKey');

    colorThemeSel.addEventListener('change', () => {
        const theme = colorThemeSel.value as keyof typeof palettes;
        const p = palettes[theme];

        // Mettre à jour les inputs
        ballColorInput.value = p.ballColor;
        paddleColorInput.value = p.paddleColor;
        glowRange.value = String(p.glowIntensity);
        trailRange.value = String(p.trailLength);
        bgColorInput.value = p.bgColor;
        bgOpacityRange.value = String(p.bgOpacity);

        // Mettre à jour l’objet settings
        gameplaySettings.colorTheme = theme;
        gameplaySettings.ballColor = p.ballColor;
        gameplaySettings.paddleColor = p.paddleColor;
        gameplaySettings.glowIntensity = p.glowIntensity;
        gameplaySettings.trailLength = p.trailLength;
        gameplaySettings.bgColor = p.bgColor;
        gameplaySettings.bgOpacity = p.bgOpacity;
    });

    formGameplay.addEventListener('submit', e => {
        e.preventDefault();
        gameplaySettings.difficulty = difficultySel.value as any;
        gameplaySettings.colorTheme = colorThemeSel.value as any;
        gameplaySettings.ballColor = ballColorInput.value;
        gameplaySettings.paddleColor = paddleColorInput.value;
        gameplaySettings.glowIntensity = Number(glowRange.value);
        gameplaySettings.trailLength = Number(trailRange.value);
        gameplaySettings.bgColor = bgColorInput.value;
        gameplaySettings.bgOpacity = Number(bgOpacityRange.value);
        gameplaySettings.p1UpKey = p1Up.value;
        gameplaySettings.p1DownKey = p1Down.value;
        gameplaySettings.p2UpKey = p2Up.value;
        gameplaySettings.p2DownKey = p2Down.value;

        // save in localStorage
        saveGameplaySettings(gameplaySettings);
        alert('Gameplay settings saved!');
    });

    // Onglets
    let currentTab: TabName = 'account';
    const nav = container.querySelector<HTMLElement>('nav[aria-label="Tabs"]')!;
    const defaultBtn = container.querySelector<HTMLButtonElement>(`button[data-tab="${currentTab}"]`)!;
    defaultBtn.classList.add('border-pink-500', 'text-white');
    container.querySelector<HTMLElement>(`#tab-${currentTab}`)!.classList.remove('hidden');

    nav.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button[data-tab]') as HTMLButtonElement | null;
        if (!btn) return;
        const tab = btn.dataset.tab as TabName;
        if (tab === currentTab) return;
        container.querySelector<HTMLButtonElement>(`button[data-tab="${currentTab}"]`)!.classList.remove('border-pink-500', 'text-white');
        container.querySelector<HTMLElement>(`#tab-${currentTab}`)!.classList.add('hidden');
        btn.classList.add('border-pink-500', 'text-white');
        container.querySelector<HTMLElement>(`#tab-${tab}`)!.classList.remove('hidden');
        currentTab = tab;
    });
}