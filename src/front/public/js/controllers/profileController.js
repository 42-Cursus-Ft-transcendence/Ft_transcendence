import { profileTemplate } from "../templates/profileTemplate.js";
export function renderProfile(container, onBack) {
    container.innerHTML = profileTemplate;
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        onBack();
    });
}
//# sourceMappingURL=profileController.js.map