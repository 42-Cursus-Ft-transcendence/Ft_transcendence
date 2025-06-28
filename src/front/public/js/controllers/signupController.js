import { signupTemplate } from '../templates/signupTemplate.js';
import { arcadeTemplate } from '../templates/arcadeTemplate.js';
export function renderSignup(container, onSuccess) {
    container.innerHTML = signupTemplate;
    const form = container.querySelector('#signupForm');
    const btn = container.querySelector('#submitBtn');
    const txt = container.querySelector('#submitText');
    const nameInput = container.querySelector('#name');
    const emailInput = container.querySelector('#email');
    const passInput = container.querySelector('#password');
    const errName = container.querySelector('#error-name');
    const errEmail = container.querySelector('#error-email');
    const errPass = container.querySelector('#error-password');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // 1) Reset des erreurs
        [errName, errEmail, errPass].forEach(p => {
            p.textContent = '';
            p.classList.add('hidden');
        });
        // 2) Validation front
        let valid = true;
        if (nameInput.value.trim().length === 0) {
            errName.textContent = 'Le nom est requis';
            errName.classList.remove('hidden');
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
            errEmail.textContent = 'Email invalide';
            errEmail.classList.remove('hidden');
            valid = false;
        }
        if (passInput.value.length < 8) {
            errPass.textContent = 'Le mot de passe doit faire ≥ 8 caractères';
            errPass.classList.remove('hidden');
            valid = false;
        }
        if (!valid)
            return;
        else {
            container.innerHTML = arcadeTemplate;
            onSuccess();
        }
    });
}
//# sourceMappingURL=signupController.js.map