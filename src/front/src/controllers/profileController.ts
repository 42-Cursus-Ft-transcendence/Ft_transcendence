import { profileTemplate } from "../templates/profileTemplate.js";

export function renderProfile(container: HTMLElement, onBack: () => void) 
{  
    container.innerHTML = profileTemplate;
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;

    backBtn.addEventListener('click', () => {
        onBack();
    });
}