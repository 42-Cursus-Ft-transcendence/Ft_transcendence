import { settingsTemplate } from "../templates/settingsTemplate.js";

export function renderSettings(container: HTMLElement, onBack: () => void) 
{  
    container.innerHTML = settingsTemplate;
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;

    backBtn.addEventListener('click', () => {
        onBack();
    });
}