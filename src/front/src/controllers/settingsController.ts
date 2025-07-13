import { settingsTemplate } from "../templates/settingsTemplate.js";

type TabName = 'account' | 'gameplay' | 'security';

export function renderSettings(container: HTMLElement, onBack: () => void) {
  // Injecte le template HTML
  container.innerHTML = settingsTemplate;

  // Bouton retour
  const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
  backBtn.addEventListener('click', onBack);

  // Onglet actif en mémoire
  let currentTab: TabName = 'account';
  
  const nav = container.querySelector<HTMLElement>('nav[aria-label="Tabs"]')!;

  const defaultBtn = container.querySelector<HTMLButtonElement>(`button[data-tab="${currentTab}"]`)!;
  defaultBtn.classList.add('border-pink-500', 'text-white');
  container.querySelector<HTMLElement>(`#tab-${currentTab}`)!.classList.remove('hidden');

  nav.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-tab]') as HTMLButtonElement | null;
    if (!btn) 
      return;
    const tab = btn.dataset.tab as TabName;
    if (tab === currentTab) 
      return;

    // Désactiver l'ancien onglet
    container
      .querySelector<HTMLButtonElement>(`button[data-tab="${currentTab}"]`)!
      .classList.remove('border-pink-500', 'text-white');
    container
      .querySelector<HTMLElement>(`#tab-${currentTab}`)!
      .classList.add('hidden');

    // Activer le nouvel onglet
    btn.classList.add('border-pink-500', 'text-white');
    container
      .querySelector<HTMLElement>(`#tab-${tab}`)!
      .classList.remove('hidden');

    currentTab = tab;
  });

 const changePhotoBtn = container.querySelector<HTMLButtonElement>('#change-photo-btn')!;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      (container.querySelector<HTMLImageElement>('#profile-img')!).src = url;
    }
  });
  changePhotoBtn.addEventListener('click', () => fileInput.click());
}