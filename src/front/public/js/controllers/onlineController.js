import { waitingTemplate } from "../templates/loadingTemplate.js";
export function renderOnline(container, onBack) {
    container.innerHTML = waitingTemplate;
    const quit = container.querySelector('#quit');
    quit.addEventListener('click', () => {
        onBack();
    });
}
//# sourceMappingURL=onlineController.js.map