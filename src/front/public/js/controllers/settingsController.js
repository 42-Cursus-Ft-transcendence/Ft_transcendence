import { settingsTemplate } from "../templates/settingsTemplate.js";
export function renderSettings(container, onBack) {
    container.innerHTML = settingsTemplate;
    // Charger profil
    const profile = {};
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
    const backBtn = container.querySelector('#backBtn');
    const profileImg = container.querySelector('#profile-img');
    const modal = container.querySelector('#avatar-selector');
    const fileInput = container.querySelector('#avatar-file-input');
    const usernameInput = container.querySelector('#username-input');
    const emailInput = container.querySelector('#email-input');
    const form = container.querySelector('#form-account');
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
    modal.querySelectorAll('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            const url = img.getAttribute('data-src');
            profileImg.src = url;
            profile.avatarURL = url;
            modal.classList.add('hidden');
        });
    });
    const importBtn = container.querySelector('#avatar-import');
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
        const payload = {};
        if (newName && newName !== profile.userName)
            payload.userName = newName;
        if (newEmail && newEmail !== profile.email)
            payload.email = newEmail;
        if (newAvatar && newAvatar !== profile.avatarURL)
            payload.avatarURL = newAvatar;
        if (!Object.keys(payload).length) {
            alert('No changes');
            return;
        }
        try {
            const res = await fetch('/api/settings/account', {
                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!res.ok)
                throw new Error();
            const updated = await res.json();
            if (updated.userName)
                localStorage.setItem('userName', updated.userName);
            if (updated.email)
                localStorage.setItem('email', updated.email);
            if (updated.avatarURL)
                localStorage.setItem('avatarURL', updated.avatarURL);
            if (updated.avatarURL)
                profileImg.src = updated.avatarURL;
            if (updated.userName)
                usernameInput.value = updated.userName;
            if (updated.email)
                emailInput.value = updated.email;
            Object.assign(profile, updated);
            alert('Saved!');
        }
        catch {
            alert('Error saving');
        }
    });
    // Onglets
    let currentTab = 'account';
    const nav = container.querySelector('nav[aria-label="Tabs"]');
    const defaultBtn = container.querySelector(`button[data-tab="${currentTab}"]`);
    defaultBtn.classList.add('border-pink-500', 'text-white');
    container.querySelector(`#tab-${currentTab}`).classList.remove('hidden');
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-tab]');
        if (!btn)
            return;
        const tab = btn.dataset.tab;
        if (tab === currentTab)
            return;
        container.querySelector(`button[data-tab="${currentTab}"]`).classList.remove('border-pink-500', 'text-white');
        container.querySelector(`#tab-${currentTab}`).classList.add('hidden');
        btn.classList.add('border-pink-500', 'text-white');
        container.querySelector(`#tab-${tab}`).classList.remove('hidden');
        currentTab = tab;
    });
}
//# sourceMappingURL=settingsController.js.map