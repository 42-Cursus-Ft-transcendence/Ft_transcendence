import { settingsTemplate } from "../templates/settingsTemplate.js";
export function renderSettings(container, onBack) {
    // Injecte le template HTML
    container.innerHTML = settingsTemplate;
    // Bouton retour
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', onBack);
    // Onglet actif en mémoire
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
        // Désactiver l'ancien onglet
        container
            .querySelector(`button[data-tab="${currentTab}"]`)
            .classList.remove('border-pink-500', 'text-white');
        container
            .querySelector(`#tab-${currentTab}`)
            .classList.add('hidden');
        // Activer le nouvel onglet
        btn.classList.add('border-pink-500', 'text-white');
        container
            .querySelector(`#tab-${tab}`)
            .classList.remove('hidden');
        currentTab = tab;
    });
    const changePhotoBtn = container.querySelector('#change-photo-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            (container.querySelector('#profile-img')).src = url;
        }
    });
    changePhotoBtn.addEventListener('click', () => fileInput.click());
}
//# sourceMappingURL=settingsController.js.map