import { iaTemplate } from "../templates/iaTemplate.js";
export function renderVsIa(container, onBack) {
    container.innerHTML = iaTemplate;
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        onBack();
    });
}
//# sourceMappingURL=iaController.js.map