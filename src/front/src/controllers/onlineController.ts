import { onlineTemplate } from "../templates/onlineTemplate.js";

export function renderOnline(container: HTMLElement, onBack: () => void) 
{  
    container.innerHTML = onlineTemplate;
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;

    backBtn.addEventListener('click', () => {
        onBack();
    });
}