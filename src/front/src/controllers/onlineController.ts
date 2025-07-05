import { waitingTemplate } from "../templates/loadingTemplate.js";

export function renderOnline(container: HTMLElement, onBack: () => void) {
    container.innerHTML = waitingTemplate;
    const quit = container.querySelector<HTMLButtonElement>('#quit')!;
    quit.addEventListener('click', () => {
        onBack();
    });
 
}