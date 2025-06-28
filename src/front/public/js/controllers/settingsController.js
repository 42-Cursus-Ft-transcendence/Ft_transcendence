import { settingsTemplate } from "../templates/settingsTemplate.js";
export function renderSettings(container, onBack) {
    container.innerHTML = settingsTemplate;
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        onBack();
    });
}
//# sourceMappingURL=settingsController.js.map