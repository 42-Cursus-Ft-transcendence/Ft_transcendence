import { onlineTemplate } from "../templates/onlineTemplate.js";
export function renderOnline(container, onBack) {
    container.innerHTML = onlineTemplate;
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        onBack();
    });
}
//# sourceMappingURL=onlineController.js.map