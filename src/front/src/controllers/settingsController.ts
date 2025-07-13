import { settingsTemplate } from "../templates/settingsTemplate.js";

type TabName = 'account' | 'gameplay' | 'security';

interface UserProfile {
    userName: string;
    email: string;
    avatarURL?: string;
}

export function renderSettings(container: HTMLElement, onBack: () => void) {
    container.innerHTML = settingsTemplate;

    // Charger profil
    const profile: Partial<UserProfile> = {};
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('email');
    const storedAvatar = localStorage.getItem('avatarURL');
    if (storedName) profile.userName = storedName;
    if (storedEmail) profile.email = storedEmail;
    if (storedAvatar) profile.avatarURL = storedAvatar;

    // Sélecteurs
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
    const profileImg = container.querySelector<HTMLImageElement>('#profile-img')!;
    const modal = container.querySelector<HTMLDivElement>('#avatar-selector')!;
    const fileInput = container.querySelector<HTMLInputElement>('#avatar-file-input')!;
    const usernameInput = container.querySelector<HTMLInputElement>('#username-input')!;
    const emailInput = container.querySelector<HTMLInputElement>('#email-input')!;
    const form = container.querySelector<HTMLFormElement>('#form-account')!;

    // Initialiser champs
    if (profile.avatarURL) profileImg.src = profile.avatarURL;
    if (profile.userName) usernameInput.value = profile.userName;
    if (profile.email) emailInput.value = profile.email;

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